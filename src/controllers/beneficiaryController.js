const { Op } = require("sequelize");
const {
  Beneficiary,
  Dependent,
  Document,
  User,
  Category,
  CategoryAssignment,
  Disbursement,
  Program,
  FieldConfig,
  sequelize,
} = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { calculateAge } = require("../utils/ageHelper");
const { buildPagination } = require("../utils/pagination");

// Helper: add age to beneficiary JSON
const addAge = (beneficiary) => {
  const json = beneficiary.toJSON ? beneficiary.toJSON() : { ...beneficiary };
  json.age = calculateAge(json.dateOfBirth);
  if (json.dependents) {
    json.dependents = json.dependents.map((d) => {
      const dep = d.toJSON ? d.toJSON() : { ...d };
      dep.age = calculateAge(dep.dateOfBirth);
      return dep;
    });
  }
  return json;
};

// Generate beneficiary number: BNIF-XXXXXX (zero-padded auto-increment)
const generateBeneficiaryNumber = async () => {
  const last = await Beneficiary.findOne({
    order: [["id", "DESC"]],
    attributes: ["id"],
  });
  const nextId = (last?.id || 0) + 1;
  return `BNIF-${String(nextId).padStart(6, "0")}`;
};

const getBeneficiaries = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, categoryId, disbursementStatus, needUpdate } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where[Op.or] = [
        { beneficiaryNumber: { [Op.like]: `%${search}%` } },
        { nationalId: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter by disbursement status: "received" or "not_received"
    if (disbursementStatus === "received") {
      where.id = {
        [Op.in]: sequelize.literal(
          "(SELECT DISTINCT `beneficiaryId` FROM `Disbursements`)"
        ),
      };
    } else if (disbursementStatus === "not_received") {
      where.id = {
        [Op.notIn]: sequelize.literal(
          "(SELECT DISTINCT `beneficiaryId` FROM `Disbursements`)"
        ),
      };
    }

    // Filter: need update — nextUpdate is within 30 days or already passed
    if (needUpdate === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.nextUpdate = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.lte]: thirtyDaysFromNow.toISOString().split("T")[0] },
        ],
      };
    }

    const { count, rows: beneficiaries } = await Beneficiary.findAndCountAll({
      where,
      include: [
        { model: User, as: "createdBy", attributes: ["id", "name"] },
        { model: Category, as: "category", attributes: ["id", "name", "color"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      beneficiaries: beneficiaries.map((b) => addAge(b)),
      pagination: buildPagination(count, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

const getBeneficiaryById = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findByPk(req.params.id, {
      include: [
        { model: User, as: "createdBy", attributes: ["id", "name"] },
        { model: Category, as: "category", attributes: ["id", "name", "color"] },
        { model: Dependent, as: "dependents" },
        {
          model: Document,
          as: "documents",
          include: [{ model: User, as: "uploadedBy", attributes: ["id", "name"] }],
        },
        {
          model: Disbursement,
          as: "disbursements",
          include: [
            { model: Program, as: "program", attributes: ["id", "name"] },
            { model: User, as: "disbursedBy", attributes: ["id", "name"] },
          ],
          order: [["disbursedAt", "DESC"]],
        },
      ],
    });

    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    res.json({ success: true, beneficiary: addAge(beneficiary) });
  } catch (error) {
    next(error);
  }
};

const createBeneficiary = async (req, res, next) => {
  try {
    const { nationalId } = req.body;

    if (!nationalId) {
      throw new ValidationError("رقم الهوية مطلوب");
    }

    const existing = await Beneficiary.findOne({ where: { nationalId } });
    if (existing) {
      throw new ValidationError("رقم الهوية مسجل مسبقاً");
    }

    // Check if nationalId is registered as a dependent
    const asDependent = await Dependent.findOne({ where: { nationalId } });
    if (asDependent) {
      const parentBeneficiary = await Beneficiary.findByPk(asDependent.beneficiaryId, {
        attributes: ["beneficiaryNumber", "name"],
      });
      throw new ValidationError(
        `رقم الهوية مسجل كتابع لدى المستفيد ${parentBeneficiary ? parentBeneficiary.name + " (" + parentBeneficiary.beneficiaryNumber + ")" : asDependent.beneficiaryId}`
      );
    }

    // Category cannot be set at creation — use assign-category endpoint
    const { categoryId, ...safeBody } = req.body;

    const beneficiaryNumber = await generateBeneficiaryNumber();

    const beneficiary = await Beneficiary.create({
      ...safeBody,
      beneficiaryNumber,
      createdById: req.user.id,
    });

    res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    next(error);
  }
};

const updateBeneficiary = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findByPk(req.params.id);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    // If nationalId is being changed, check uniqueness
    if (req.body.nationalId && req.body.nationalId !== beneficiary.nationalId) {
      const existingBeneficiary = await Beneficiary.findOne({
        where: { nationalId: req.body.nationalId, id: { [Op.ne]: beneficiary.id } },
      });
      if (existingBeneficiary) {
        throw new ValidationError("رقم الهوية مسجل مسبقاً");
      }

      const asDependent = await Dependent.findOne({ where: { nationalId: req.body.nationalId } });
      if (asDependent) {
        const parentBeneficiary = await Beneficiary.findByPk(asDependent.beneficiaryId, {
          attributes: ["beneficiaryNumber", "name"],
        });
        throw new ValidationError(
          `رقم الهوية مسجل كتابع لدى المستفيد ${parentBeneficiary ? parentBeneficiary.name + " (" + parentBeneficiary.beneficiaryNumber + ")" : asDependent.beneficiaryId}`
        );
      }
    }

    // Category cannot be changed through update — use assign-category endpoint
    // Status cannot be changed through update — use submit/review endpoints
    const { categoryId, status, returnNote, ...safeBody } = req.body;

    await beneficiary.update(safeBody);

    res.json({ success: true, beneficiary });
  } catch (error) {
    next(error);
  }
};

// Assign or change category (dedicated permission + mandatory note)
const assignCategory = async (req, res, next) => {
  try {
    const { categoryId, note } = req.body;

    if (!categoryId) throw new ValidationError("الفئة مطلوبة");
    if (!note || !note.trim()) throw new ValidationError("سبب التعيين مطلوب");

    const beneficiary = await Beneficiary.findByPk(req.params.id, {
      include: [{ model: Category, as: "category" }],
    });
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    const category = await Category.findByPk(categoryId);
    if (!category) throw new NotFoundError("الفئة غير موجودة");

    const previousCategoryId = beneficiary.categoryId;

    // Record the assignment
    await CategoryAssignment.create({
      beneficiaryId: beneficiary.id,
      categoryId,
      previousCategoryId,
      assignedById: req.user.id,
      note: note.trim(),
    });

    // Update the beneficiary — also set status to approved
    await beneficiary.update({ categoryId, status: "approved", returnNote: null });

    res.json({
      success: true,
      message: "تم تعيين الفئة",
      beneficiary: {
        id: beneficiary.id,
        beneficiaryNumber: beneficiary.beneficiaryNumber,
        categoryId,
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get category assignment history for a beneficiary
const getCategoryHistory = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findByPk(req.params.id);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    const history = await CategoryAssignment.findAll({
      where: { beneficiaryId: req.params.id },
      include: [
        { model: Category, as: "category", attributes: ["id", "name", "color"] },
        { model: Category, as: "previousCategory", attributes: ["id", "name", "color"] },
        { model: User, as: "assignedBy", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

const deleteBeneficiary = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findByPk(req.params.id);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    await beneficiary.destroy();

    res.json({ success: true, message: "تم حذف المستفيد" });
  } catch (error) {
    next(error);
  }
};

// Submit beneficiary for review (validates all mandatory fields)
const submitForReview = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findByPk(req.params.id, {
      include: [{ model: Dependent, as: "dependents" }],
    });
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    if (beneficiary.status !== "draft" && beneficiary.status !== "returned") {
      throw new ValidationError("لا يمكن تقديم الملف للمراجعة في الحالة الحالية");
    }

    // Validate all mandatory beneficiary fields
    const requiredBenFields = await FieldConfig.findAll({
      where: { fieldGroup: "beneficiary", isRequired: true },
    });

    const missingFields = [];
    for (const fc of requiredBenFields) {
      const val = beneficiary[fc.fieldName];
      if (val === null || val === undefined || val === "") {
        missingFields.push({ fieldName: fc.fieldName, fieldLabel: fc.fieldLabel });
      }
    }

    // Validate all mandatory dependent fields
    const requiredDepFields = await FieldConfig.findAll({
      where: { fieldGroup: "dependent", isRequired: true },
    });

    const dependentMissing = [];
    if (requiredDepFields.length > 0 && beneficiary.dependents) {
      for (const dep of beneficiary.dependents) {
        for (const fc of requiredDepFields) {
          const val = dep[fc.fieldName];
          if (val === null || val === undefined || val === "") {
            dependentMissing.push({
              dependentId: dep.id,
              dependentName: dep.name || "بدون اسم",
              fieldName: fc.fieldName,
              fieldLabel: fc.fieldLabel,
            });
          }
        }
      }
    }

    if (missingFields.length > 0 || dependentMissing.length > 0) {
      throw new ValidationError("الحقول المطلوبة غير مكتملة", {
        beneficiaryMissing: missingFields,
        dependentMissing,
      });
    }

    await beneficiary.update({ status: "pending_review", returnNote: null });

    res.json({ success: true, message: "تم تقديم الملف للمراجعة", beneficiary: addAge(beneficiary) });
  } catch (error) {
    next(error);
  }
};

// Get beneficiaries pending review (for review committee)
const getReviewQueue = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    const where = { status: "pending_review" };

    if (search) {
      where[Op.or] = [
        { beneficiaryNumber: { [Op.like]: `%${search}%` } },
        { nationalId: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Beneficiary.findAndCountAll({
      where,
      include: [
        { model: User, as: "createdBy", attributes: ["id", "name"] },
        { model: Category, as: "category", attributes: ["id", "name", "color"] },
        { model: Dependent, as: "dependents" },
        {
          model: Document,
          as: "documents",
          include: [{ model: User, as: "uploadedBy", attributes: ["id", "name"] }],
        },
      ],
      order: [["updatedAt", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      beneficiaries: rows.map((b) => addAge(b)),
      pagination: buildPagination(count, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// Return beneficiary to researcher with note
const returnBeneficiary = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) throw new ValidationError("ملاحظة الإرجاع مطلوبة");

    const beneficiary = await Beneficiary.findByPk(req.params.id);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    if (beneficiary.status !== "pending_review") {
      throw new ValidationError("لا يمكن إرجاع ملف ليس بانتظار المراجعة");
    }

    await beneficiary.update({ status: "returned", returnNote: note.trim() });

    res.json({ success: true, message: "تم إرجاع الملف للباحث", beneficiary: addAge(beneficiary) });
  } catch (error) {
    next(error);
  }
};

// Get beneficiary data completeness progress
const getBeneficiaryProgress = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findByPk(req.params.id, {
      include: [{ model: Dependent, as: "dependents" }],
    });
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    const requiredBenFields = await FieldConfig.findAll({
      where: { fieldGroup: "beneficiary", isRequired: true },
    });

    const totalRequired = requiredBenFields.length;
    let filledCount = 0;
    const pendingFields = [];

    for (const fc of requiredBenFields) {
      const val = beneficiary[fc.fieldName];
      if (val !== null && val !== undefined && val !== "") {
        filledCount++;
      } else {
        pendingFields.push({ fieldName: fc.fieldName, fieldLabel: fc.fieldLabel });
      }
    }

    const progress = totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) : 100;

    res.json({
      success: true,
      progress,
      totalRequired,
      filledCount,
      pendingFields,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  assignCategory,
  getCategoryHistory,
  submitForReview,
  getReviewQueue,
  returnBeneficiary,
  getBeneficiaryProgress,
};
