const { Category, Program } = require("../models");
const { Op } = require("sequelize");

const { NotFoundError, ValidationError } = require("../utils/errors");
const auditService = require("../services/auditService");

const getCategories = async (req, res, next) => {
  try {
    const where = {};

    const categories = await Category.findAll({
      where,
      include: [
        {
          model: Program,
          as: "programs",
          through: { attributes: [] }, // This is needed for many-to-many
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });

    // Map to include program count
    const categoriesWithCount = categories.map((cat) => ({
      ...cat.toJSON(),
      programCount: cat.programs ? cat.programs.length : 0,
    }));

    res.json({ success: true, categories: categoriesWithCount });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{ model: Program, as: "programs" }],
    });

    if (!category) {
      throw new NotFoundError("الفئة غير موجودة");
    }

    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const data = req.body;

    const existingName = await Category.findOne({ where: { name: data.name } });
    if (existingName) {
      throw new ValidationError("اسم الفئة موجود بالفعل");
    }

    const category = await Category.create(data);

    await auditService.logCreate(req, "CATEGORY", category.id, {
      name: category.name,
    });

    res
      .status(201)
      .json({ success: true, message: "تم إنشاء الفئة", category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      throw new NotFoundError("الفئة غير موجودة");
    }

    // Category name is fixed — only description and color can be edited
    const { name, ...allowedFields } = req.body;

    const oldValues = category.toJSON();
    await category.update(allowedFields);

    await auditService.logUpdate(
      req,
      "CATEGORY",
      category.id,
      oldValues,
      category.toJSON()
    );

    res.json({ success: true, message: "تم تحديث الفئة", category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [{ model: Program, as: "programs" }],
    });

    if (!category) {
      throw new NotFoundError("الفئة غير موجودة");
    }

    if (category.programs && category.programs.length > 0) {
      throw new ValidationError(
        "لا يمكن حذف فئة مرتبطة ببرامج"
      );
    }

    const oldValues = category.toJSON();
    await category.destroy();

    await auditService.logDelete(req, "CATEGORY", category.id, oldValues);

    res.json({ success: true, message: "تم حذف الفئة" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
