const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");
const { Beneficiary, Program, Category, Disbursement, Dependent, User } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { checkFamilyEligibility } = require("../utils/eligibilityHelper");
const { buildPagination } = require("../utils/pagination");
const {
  generateAcknowledgmentPdf,
  streamAcknowledgmentPdf,
  getFullPdfPath,
} = require("../utils/pdfGenerator");

// Get active programs
const getActivePrograms = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const programs = await Program.findAll({
      where: {
        isActive: true,
        [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: today } }],
      },
      include: [{
        model: Category,
        as: "categories",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
      }],
      order: [["name", "ASC"]],
    });

    res.json({ success: true, programs });
  } catch (error) {
    next(error);
  }
};

// Check eligibility for a beneficiary and program
const checkEligibility = async (req, res, next) => {
  try {
    const { programId, searchQuery } = req.body;

    const program = await Program.findByPk(programId, {
      include: [{
        model: Category,
        as: "categories",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
      }],
    });

    if (!program) throw new NotFoundError("البرنامج غير موجود");

    const today = new Date().toISOString().split("T")[0];
    if (!program.isActive || (program.endDate && program.endDate < today)) {
      return res.json({ success: true, eligible: false, reason: "البرنامج غير نشط حالياً", beneficiary: null });
    }

    // Find by beneficiary number or national ID
    const beneficiary = await Beneficiary.findOne({
      where: {
        [Op.or]: [{ beneficiaryNumber: searchQuery }, { nationalId: searchQuery }],
      },
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "color"] },
        { model: Dependent, as: "dependents", attributes: ["id", "name", "nationalId"] },
      ],
    });

    if (!beneficiary) {
      return res.json({ success: true, eligible: false, reason: "المستفيد غير موجود", beneficiary: null });
    }

    const beneficiaryInfo = {
      id: beneficiary.id,
      beneficiaryNumber: beneficiary.beneficiaryNumber,
      name: beneficiary.name,
      nationalId: beneficiary.nationalId,
      category: beneficiary.category,
    };

    if (!beneficiary.categoryId) {
      return res.json({ success: true, eligible: false, reason: "المستفيد ليس له فئة محددة", beneficiary: beneficiaryInfo });
    }

    // Check category match
    const programCategoryIds = program.categories.map((c) => c.id);
    if (!programCategoryIds.includes(beneficiary.categoryId)) {
      return res.json({
        success: true,
        eligible: false,
        reason: `فئة المستفيد (${beneficiary.category.name}) غير مؤهلة لهذا البرنامج`,
        beneficiary: beneficiaryInfo,
      });
    }

    // Check if beneficiary already received from this program
    const familyCheck = await checkFamilyEligibility(beneficiary, program.id);
    if (familyCheck.blocked) {
      return res.json({
        success: true,
        eligible: false,
        reason: familyCheck.reason,
        beneficiary: beneficiaryInfo,
      });
    }

    res.json({
      success: true,
      eligible: true,
      beneficiary: {
        id: beneficiary.id,
        beneficiaryNumber: beneficiary.beneficiaryNumber,
        name: beneficiary.name,
        nationalId: beneficiary.nationalId,
        phone: beneficiary.phone,
        category: beneficiary.category,
        dependents: beneficiary.dependents,
      },
      program: { id: program.id, name: program.name, description: program.description },
    });
  } catch (error) {
    next(error);
  }
};

// Create disbursement
const createDisbursement = async (req, res, next) => {
  try {
    const { beneficiaryId, programId, receiverName, signature, notes } = req.body;

    const beneficiary = await Beneficiary.findByPk(beneficiaryId, {
      include: [
        { model: Category, as: "category" },
        { model: Dependent, as: "dependents", attributes: ["id", "name", "nationalId", "beneficiaryId"] },
      ],
    });
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    const program = await Program.findByPk(programId, {
      include: [{ model: Category, as: "categories", through: { attributes: [] } }],
    });
    if (!program) throw new NotFoundError("البرنامج غير موجود");

    // Check category eligibility
    const programCategoryIds = program.categories.map((c) => c.id);
    if (!programCategoryIds.includes(beneficiary.categoryId)) {
      throw new ValidationError("المستفيد غير مؤهل لهذا البرنامج");
    }

    // Check family eligibility (beneficiary + dependents haven't received)
    const familyCheck = await checkFamilyEligibility(beneficiary, programId);
    if (familyCheck.blocked) {
      throw new ValidationError(familyCheck.reason);
    }

    const disbursedBy = await User.findByPk(req.user.id);

    const disbursement = await Disbursement.create({
      beneficiaryId,
      programId,
      disbursedById: req.user.id,
      receiverName: receiverName || null,
      notes: notes || null,
      disbursedAt: new Date(),
    });

    // Generate PDF
    let pdfFileName = null;
    try {
      pdfFileName = await generateAcknowledgmentPdf({
        disbursement,
        caseData: beneficiary,
        program,
        disbursedBy,
        signatureData: signature || null,
      });
      await disbursement.update({ acknowledgmentFile: pdfFileName });
    } catch (pdfError) {
      console.error("خطأ في إنشاء PDF:", pdfError);
    }

    res.status(201).json({ success: true, disbursement });
  } catch (error) {
    next(error);
  }
};

// Get disbursement details
const getDisbursementById = async (req, res, next) => {
  try {
    const disbursement = await Disbursement.findByPk(req.params.id, {
      include: [
        { model: Beneficiary, as: "beneficiary", include: [{ model: Category, as: "category" }] },
        { model: Program, as: "program" },
        { model: User, as: "disbursedBy", attributes: ["id", "name", "email"] },
      ],
    });

    if (!disbursement) throw new NotFoundError("عملية الصرف غير موجودة");

    res.json({ success: true, disbursement });
  } catch (error) {
    next(error);
  }
};

// Get disbursements for a beneficiary
const getBeneficiaryDisbursements = async (req, res, next) => {
  try {
    const { beneficiaryId } = req.params;

    const disbursements = await Disbursement.findAll({
      where: { beneficiaryId },
      include: [
        { model: Program, as: "program" },
        { model: User, as: "disbursedBy", attributes: ["id", "name"] },
      ],
      order: [["disbursedAt", "DESC"]],
    });

    res.json({ success: true, disbursements });
  } catch (error) {
    next(error);
  }
};

// Get all disbursements
const getDisbursements = async (req, res, next) => {
  try {
    const { programId, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (programId) where.programId = programId;

    const include = [
      {
        model: Beneficiary,
        as: "beneficiary",
        attributes: ["id", "beneficiaryNumber", "name", "nationalId"],
        ...(search && {
          where: {
            [Op.or]: [
              { beneficiaryNumber: { [Op.like]: `%${search}%` } },
              { nationalId: { [Op.like]: `%${search}%` } },
              { name: { [Op.like]: `%${search}%` } },
            ],
          },
        }),
      },
      { model: Program, as: "program", attributes: ["id", "name"] },
      { model: User, as: "disbursedBy", attributes: ["id", "name"] },
    ];

    const { count, rows } = await Disbursement.findAndCountAll({
      where,
      include,
      order: [["disbursedAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      disbursements: rows,
      pagination: buildPagination(count, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// Generate PDF on-demand
const getAcknowledgmentPdf = async (req, res, next) => {
  try {
    const disbursement = await Disbursement.findByPk(req.params.id, {
      include: [
        { model: Beneficiary, as: "beneficiary", include: [{ model: Category, as: "category" }] },
        { model: Program, as: "program" },
        { model: User, as: "disbursedBy", attributes: ["id", "name", "email"] },
      ],
    });

    if (!disbursement) throw new NotFoundError("عملية الصرف غير موجودة");

    if (disbursement.acknowledgmentFile) {
      const filePath = getFullPdfPath(disbursement.acknowledgmentFile);
      if (filePath && fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${path.basename(disbursement.acknowledgmentFile)}"`);
        return res.sendFile(filePath);
      }
    }

    await streamAcknowledgmentPdf(
      {
        disbursement,
        caseData: disbursement.beneficiary,
        program: disbursement.program,
        disbursedBy: disbursement.disbursedBy,
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivePrograms,
  checkEligibility,
  createDisbursement,
  getDisbursementById,
  getBeneficiaryDisbursements,
  getDisbursements,
  getAcknowledgmentPdf,
};
