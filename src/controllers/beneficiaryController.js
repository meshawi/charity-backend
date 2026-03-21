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
const auditService = require("../services/auditService");

// Generate beneficiary number: YYYY_XXXXXX (underscore for easy copy)
const generateBeneficiaryNumber = async () => {
  const year = new Date().getFullYear();
  const last = await Beneficiary.findOne({
    where: sequelize.where(
      sequelize.fn("LEFT", sequelize.col("beneficiaryNumber"), 5),
      `${year}_`
    ),
    order: [["id", "DESC"]],
  });

  let seq = 1;
  if (last) {
    seq = parseInt(last.beneficiaryNumber.split("_")[1]) + 1;
  }
  return `${year}_${String(seq).padStart(6, "0")}`;
};

const getBeneficiaries = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, categoryId } = req.query;
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
      beneficiaries,
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

    res.json({ success: true, beneficiary });
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

    await auditService.logCreate(req, "BENEFICIARY", beneficiary.id, {
      beneficiaryNumber: beneficiary.beneficiaryNumber,
      nationalId: beneficiary.nationalId,
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

    // Validate required fields based on FieldConfig
    const requiredFields = await FieldConfig.findAll({
      where: { fieldGroup: "beneficiary", isRequired: true },
    });

    for (const fc of requiredFields) {
      const val = req.body[fc.fieldName];
      if (val === null || val === undefined || val === "") {
        throw new ValidationError(`الحقل "${fc.fieldLabel}" مطلوب`);
      }
    }

    // Category cannot be changed through update — use assign-category endpoint
    const { categoryId, ...safeBody } = req.body;

    const oldValues = beneficiary.toJSON();
    await beneficiary.update(safeBody);

    await auditService.logUpdate(req, "BENEFICIARY", beneficiary.id, oldValues, beneficiary.toJSON());

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

    // Update the beneficiary
    await beneficiary.update({ categoryId });

    await auditService.log({
      action: "CATEGORY_ASSIGNMENT",
      entityType: "BENEFICIARY",
      entityId: beneficiary.id,
      oldValues: { categoryId: previousCategoryId },
      newValues: { categoryId, note: note.trim() },
      ...auditService.getRequestInfo(req),
    });

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

    const oldValues = beneficiary.toJSON();
    await beneficiary.destroy();

    await auditService.logDelete(req, "BENEFICIARY", beneficiary.id, oldValues);

    res.json({ success: true, message: "تم حذف المستفيد" });
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
};
