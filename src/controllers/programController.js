const { Program, Category } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const auditService = require("../services/auditService");
const { deactivateExpiredPrograms } = require("../utils/programUtils");

const getPrograms = async (req, res, next) => {
  try {
    // Auto-deactivate expired programs first
    await deactivateExpiredPrograms(Program);

    const { categoryId } = req.query;

    // Return all programs (active and inactive) - filtering done on UI
    const include = [
      {
        model: Category,
        as: "categories",
        attributes: ["id", "name", "color"],
        through: { attributes: [] },
      },
    ];

    let programs = await Program.findAll({
      include,
      order: [
        ["isActive", "DESC"], // Active programs first
        ["name", "ASC"],
      ],
    });

    // Filter by category if specified
    if (categoryId) {
      programs = programs.filter((p) =>
        p.categories.some((c) => c.id === parseInt(categoryId))
      );
    }

    res.json({ success: true, programs });
  } catch (error) {
    next(error);
  }
};

const getProgramById = async (req, res, next) => {
  try {
    const program = await Program.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name", "color"],
          through: { attributes: [] },
        },
      ],
    });

    if (!program) {
      throw new NotFoundError("البرنامج غير موجود");
    }

    res.json({ success: true, program });
  } catch (error) {
    next(error);
  }
};

const createProgram = async (req, res, next) => {
  try {
    const { name, description, categoryIds, startDate, endDate } =
      req.body;

    if (!categoryIds || categoryIds.length === 0) {
      throw new ValidationError("يجب اختيار فئة واحدة على الأقل");
    }

    const categories = await Category.findAll({ where: { id: categoryIds } });
    if (categories.length !== categoryIds.length) {
      throw new ValidationError("فئة أو أكثر غير موجودة");
    }

    const program = await Program.create({
      name,
      description,
      startDate,
      endDate,
    });
    await program.setCategories(categories);

    await program.reload({
      include: [
        { model: Category, as: "categories", through: { attributes: [] } },
      ],
    });

    await auditService.logCreate(req, "PROGRAM", program.id, {
      name: program.name,
      categoryIds,
    });

    res
      .status(201)
      .json({ success: true, message: "تم إنشاء البرنامج", program });
  } catch (error) {
    next(error);
  }
};

const updateProgram = async (req, res, next) => {
  try {
    const program = await Program.findByPk(req.params.id, {
      include: [
        { model: Category, as: "categories", through: { attributes: [] } },
      ],
    });

    if (!program) {
      throw new NotFoundError("البرنامج غير موجود");
    }

    const { name, description, categoryIds, startDate, endDate, isActive } =
      req.body;

    const oldValues = {
      ...program.toJSON(),
      categoryIds: program.categories.map((c) => c.id),
    };

    await program.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(isActive !== undefined && { isActive }),
    });

    // Update categories if provided
    if (categoryIds) {
      if (categoryIds.length === 0) {
        throw new ValidationError("يجب اختيار فئة واحدة على الأقل");
      }
      const categories = await Category.findAll({ where: { id: categoryIds } });
      if (categories.length !== categoryIds.length) {
        throw new ValidationError("فئة أو أكثر غير موجودة");
      }
      await program.setCategories(categories);
    }

    await program.reload({
      include: [
        { model: Category, as: "categories", through: { attributes: [] } },
      ],
    });

    await auditService.logUpdate(req, "PROGRAM", program.id, oldValues, {
      ...program.toJSON(),
      categoryIds: program.categories.map((c) => c.id),
    });

    res.json({ success: true, message: "تم تحديث البرنامج", program });
  } catch (error) {
    next(error);
  }
};

const deleteProgram = async (req, res, next) => {
  try {
    const program = await Program.findByPk(req.params.id);

    if (!program) {
      throw new NotFoundError("البرنامج غير موجود");
    }

    const oldValues = program.toJSON();
    await program.destroy();

    await auditService.logDelete(req, "PROGRAM", program.id, oldValues);

    res.json({ success: true, message: "تم حذف البرنامج" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
};
