const { Category, Program, Beneficiary, ProgramCategory } = require("../models");
const { Op } = require("sequelize");

const { NotFoundError, ValidationError } = require("../utils/errors");

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

const createCategory = async (req, res, next) => {
  try {
    const data = req.body;

    const existingName = await Category.findOne({ where: { name: data.name } });
    if (existingName) {
      throw new ValidationError("اسم الفئة موجود بالفعل");
    }

    const category = await Category.create(data);

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

    // Check name uniqueness if changing
    if (req.body.name && req.body.name !== category.name) {
      const existing = await Category.findOne({ where: { name: req.body.name } });
      if (existing) throw new ValidationError("اسم الفئة موجود بالفعل");
    }

    await category.update(req.body);

    res.json({ success: true, message: "تم تحديث الفئة", category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      throw new NotFoundError("الفئة غير موجودة");
    }

    // Unlink beneficiaries (set categoryId to null)
    await Beneficiary.update(
      { categoryId: null },
      { where: { categoryId: category.id } }
    );

    // Unlink programs (remove join table rows)
    await ProgramCategory.destroy({ where: { categoryId: category.id } });

    await category.destroy();

    res.json({ success: true, message: "تم حذف الفئة" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
