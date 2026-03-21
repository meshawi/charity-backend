const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");
const { Beneficiary, Program, Category, Disbursement, Dependent, User } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const auditService = require("../services/auditService");
const { deactivateExpiredPrograms } = require("../utils/programUtils");
const {
  generateAcknowledgmentPdf,
  streamAcknowledgmentPdf,
  getFullPdfPath,
} = require("../utils/pdfGenerator");

// Get active programs
const getActivePrograms = async (req, res, next) => {
  try {
    await deactivateExpiredPrograms(Program);

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
    const existing = await Disbursement.findOne({
      where: { beneficiaryId: beneficiary.id, programId: program.id },
      include: [{ model: User, as: "disbursedBy", attributes: ["name"] }],
    });

    if (existing) {
      return res.json({
        success: true,
        eligible: false,
        reason: `تم الصرف مسبقاً بتاريخ ${new Date(existing.disbursedAt).toLocaleDateString("ar-SA")}`,
        beneficiary: beneficiaryInfo,
      });
    }

    // Check if any family member (dependent) already received from this program
    const dependentNationalIds = beneficiary.dependents
      .map((d) => d.nationalId)
      .filter(Boolean);

    if (dependentNationalIds.length > 0) {
      // Check if any dependent is registered as a beneficiary who received from this program
      const dependentAsBeneficiary = await Beneficiary.findAll({
        where: { nationalId: { [Op.in]: dependentNationalIds } },
        attributes: ["id", "name", "nationalId"],
      });

      if (dependentAsBeneficiary.length > 0) {
        const depBeneficiaryIds = dependentAsBeneficiary.map((b) => b.id);
        const depDisbursement = await Disbursement.findOne({
          where: { beneficiaryId: { [Op.in]: depBeneficiaryIds }, programId: program.id },
          include: [{ model: Beneficiary, as: "beneficiary", attributes: ["name", "nationalId"] }],
        });

        if (depDisbursement) {
          return res.json({
            success: true,
            eligible: false,
            reason: `أحد أفراد الأسرة (${depDisbursement.beneficiary.name}) استلم من هذا البرنامج مسبقاً`,
            beneficiary: beneficiaryInfo,
          });
        }
      }

      // Check if any dependent is listed under another beneficiary who received from this program
      const otherDependents = await Dependent.findAll({
        where: {
          nationalId: { [Op.in]: dependentNationalIds },
          beneficiaryId: { [Op.ne]: beneficiary.id },
        },
        attributes: ["beneficiaryId", "name", "nationalId"],
      });

      if (otherDependents.length > 0) {
        const otherBeneficiaryIds = [...new Set(otherDependents.map((d) => d.beneficiaryId))];
        const familyDisbursement = await Disbursement.findOne({
          where: { beneficiaryId: { [Op.in]: otherBeneficiaryIds }, programId: program.id },
          include: [{ model: Beneficiary, as: "beneficiary", attributes: ["name", "nationalId"] }],
        });

        if (familyDisbursement) {
          return res.json({
            success: true,
            eligible: false,
            reason: `أحد أفراد الأسرة مسجل تحت مستفيد آخر (${familyDisbursement.beneficiary.name}) استلم من هذا البرنامج مسبقاً`,
            beneficiary: beneficiaryInfo,
          });
        }
      }
    }

    // Also check: is the beneficiary's own nationalId registered as a dependent under another beneficiary who received?
    const selfAsDependent = await Dependent.findAll({
      where: { nationalId: beneficiary.nationalId },
      attributes: ["beneficiaryId", "name"],
    });

    if (selfAsDependent.length > 0) {
      const parentBeneficiaryIds = selfAsDependent.map((d) => d.beneficiaryId);
      const parentDisbursement = await Disbursement.findOne({
        where: { beneficiaryId: { [Op.in]: parentBeneficiaryIds }, programId: program.id },
        include: [{ model: Beneficiary, as: "beneficiary", attributes: ["name", "nationalId"] }],
      });

      if (parentDisbursement) {
        return res.json({
          success: true,
          eligible: false,
          reason: `المستفيد مسجل كتابع لدى مستفيد آخر (${parentDisbursement.beneficiary.name}) استلم من هذا البرنامج مسبقاً`,
          beneficiary: beneficiaryInfo,
        });
      }
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

    // Check if beneficiary already received
    const existing = await Disbursement.findOne({ where: { beneficiaryId, programId } });
    if (existing) throw new ValidationError("تم الصرف مسبقاً لهذا البرنامج");

    // Check family members (dependents) haven't received from this program
    const dependentNationalIds = beneficiary.dependents
      .map((d) => d.nationalId)
      .filter(Boolean);

    if (dependentNationalIds.length > 0) {
      // Check if any dependent is a beneficiary who received
      const depAsBeneficiaries = await Beneficiary.findAll({
        where: { nationalId: { [Op.in]: dependentNationalIds } },
        attributes: ["id"],
      });
      if (depAsBeneficiaries.length > 0) {
        const depBIds = depAsBeneficiaries.map((b) => b.id);
        const depDisbursement = await Disbursement.findOne({
          where: { beneficiaryId: { [Op.in]: depBIds }, programId },
        });
        if (depDisbursement) throw new ValidationError("أحد أفراد الأسرة استلم من هذا البرنامج مسبقاً");
      }

      // Check if any dependent is under another beneficiary who received
      const otherDeps = await Dependent.findAll({
        where: { nationalId: { [Op.in]: dependentNationalIds }, beneficiaryId: { [Op.ne]: beneficiary.id } },
        attributes: ["beneficiaryId"],
      });
      if (otherDeps.length > 0) {
        const otherBIds = [...new Set(otherDeps.map((d) => d.beneficiaryId))];
        const familyDisb = await Disbursement.findOne({
          where: { beneficiaryId: { [Op.in]: otherBIds }, programId },
        });
        if (familyDisb) throw new ValidationError("أحد أفراد الأسرة مسجل تحت مستفيد آخر استلم من هذا البرنامج مسبقاً");
      }
    }

    // Check if beneficiary is registered as a dependent under someone who received
    const selfAsDep = await Dependent.findAll({
      where: { nationalId: beneficiary.nationalId },
      attributes: ["beneficiaryId"],
    });
    if (selfAsDep.length > 0) {
      const parentIds = selfAsDep.map((d) => d.beneficiaryId);
      const parentDisb = await Disbursement.findOne({
        where: { beneficiaryId: { [Op.in]: parentIds }, programId },
      });
      if (parentDisb) throw new ValidationError("المستفيد مسجل كتابع لدى مستفيد آخر استلم من هذا البرنامج مسبقاً");
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

    await auditService.log({
      action: "DISBURSEMENT",
      entityType: "DISBURSEMENT",
      entityId: disbursement.id,
      newValues: {
        beneficiaryNumber: beneficiary.beneficiaryNumber,
        programName: program.name,
        receiverName: receiverName || "صاحب الملف",
      },
      ...auditService.getRequestInfo(req),
    });

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
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get program recipients
const getProgramRecipients = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const program = await Program.findByPk(programId);
    if (!program) throw new NotFoundError("البرنامج غير موجود");

    const include = [
      {
        model: Beneficiary,
        as: "beneficiary",
        attributes: ["id", "beneficiaryNumber", "name", "nationalId", "phone"],
        include: [{ model: Category, as: "category", attributes: ["id", "name", "color"] }],
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
      { model: User, as: "disbursedBy", attributes: ["id", "name"] },
    ];

    const { count, rows } = await Disbursement.findAndCountAll({
      where: { programId },
      include,
      order: [["disbursedAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      program: { id: program.id, name: program.name },
      recipients: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get acknowledgment PDF file
const getAcknowledgmentFile = async (req, res, next) => {
  try {
    const disbursement = await Disbursement.findByPk(req.params.id);
    if (!disbursement) throw new NotFoundError("عملية الصرف غير موجودة");

    if (disbursement.acknowledgmentFile) {
      const filePath = getFullPdfPath(disbursement.acknowledgmentFile);
      if (filePath && fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${path.basename(disbursement.acknowledgmentFile)}"`);
        return res.sendFile(filePath);
      }
    }

    throw new NotFoundError("ملف الإقرار غير موجود");
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
  getProgramRecipients,
  getAcknowledgmentFile,
  getAcknowledgmentPdf,
};
