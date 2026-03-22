const { Op } = require("sequelize");
const { Program, Category, Beneficiary, Disbursement, User } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { buildPagination } = require("../utils/pagination");

// Validate that startDate is before endDate when both are provided
const validateDates = (startDate, endDate) => {
  if (startDate && endDate && startDate >= endDate) {
    throw new ValidationError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
  }
};

const getPrograms = async (req, res, next) => {
  try {


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

const createProgram = async (req, res, next) => {
  try {
    const { name, description, categoryIds, startDate, endDate } =
      req.body;

    if (!categoryIds || categoryIds.length === 0) {
      throw new ValidationError("يجب اختيار فئة واحدة على الأقل");
    }

    validateDates(startDate, endDate);

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

    // Resolve effective dates: use provided value, or fall back to existing
    const effectiveStart = startDate !== undefined ? startDate : program.startDate;
    const effectiveEnd = endDate !== undefined ? endDate : program.endDate;
    validateDates(effectiveStart, effectiveEnd);

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

    await program.destroy();

    res.json({ success: true, message: "تم حذف البرنامج" });
  } catch (error) {
    next(error);
  }
};

// Get program beneficiaries: received, eligible (not received), or all
const getProgramBeneficiaries = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    const program = await Program.findByPk(id, {
      include: [{
        model: Category,
        as: "categories",
        attributes: ["id"],
        through: { attributes: [] },
      }],
    });
    if (!program) throw new NotFoundError("البرنامج غير موجود");

    const programCategoryIds = program.categories.map((c) => c.id);

    const searchWhere = search
      ? {
          [Op.or]: [
            { beneficiaryNumber: { [Op.like]: `%${search}%` } },
            { nationalId: { [Op.like]: `%${search}%` } },
            { name: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const beneficiaryAttrs = ["id", "beneficiaryNumber", "name", "nationalId", "phone"];
    const categoryInclude = { model: Category, as: "category", attributes: ["id", "name", "color"] };

    // Unique beneficiary IDs who received from this program
    const receivedBeneficiaryIds = new Set(
      (await Disbursement.findAll({
        where: { programId: id },
        attributes: ["beneficiaryId"],
        group: ["beneficiaryId"],
        raw: true,
      })).map((d) => d.beneficiaryId)
    );

    // Summary stats: count qualified, then intersect with received
    const qualifiedCount = await Beneficiary.count({
      where: { categoryId: { [Op.in]: programCategoryIds } },
    });
    const receivedQualifiedCount = receivedBeneficiaryIds.size > 0
      ? await Beneficiary.count({
          where: {
            categoryId: { [Op.in]: programCategoryIds },
            id: { [Op.in]: [...receivedBeneficiaryIds] },
          },
        })
      : 0;
    const summary = {
      totalQualified: qualifiedCount,
      totalReceived: receivedQualifiedCount,
      totalEligible: qualifiedCount - receivedQualifiedCount,
    };

    if (status === "received") {
      // Beneficiaries who received from this program
      const disbursementSearch = search
        ? {
            where: {
              [Op.or]: [
                { beneficiaryNumber: { [Op.like]: `%${search}%` } },
                { nationalId: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } },
              ],
            },
          }
        : {};

      const { count, rows } = await Disbursement.findAndCountAll({
        where: { programId: id },
        include: [
          {
            model: Beneficiary,
            as: "beneficiary",
            attributes: beneficiaryAttrs,
            include: [categoryInclude],
            ...disbursementSearch,
          },
          { model: User, as: "disbursedBy", attributes: ["id", "name"] },
        ],
        order: [["disbursedAt", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      return res.json({
        success: true,
        programName: program.name,
        status: "received",
        beneficiaries: rows.map((d) => ({
          ...d.beneficiary.toJSON(),
          disbursement: {
            id: d.id,
            disbursedAt: d.disbursedAt,
            receiverName: d.receiverName,
            disbursedBy: d.disbursedBy,
          },
        })),
        summary,
        pagination: buildPagination(count, page, limit),
      });
    }

    if (status === "eligible") {
      // Qualified by category but have NOT received
      const where = {
        categoryId: { [Op.in]: programCategoryIds },
        ...(receivedBeneficiaryIds.size > 0 && { id: { [Op.notIn]: [...receivedBeneficiaryIds] } }),
        ...searchWhere,
      };

      const { count, rows } = await Beneficiary.findAndCountAll({
        where,
        attributes: beneficiaryAttrs,
        include: [categoryInclude],
        order: [["name", "ASC"]],
        limit: parseInt(limit),
        offset,
      });

      return res.json({
        success: true,
        programName: program.name,
        status: "eligible",
        beneficiaries: rows,
        summary,
        pagination: buildPagination(count, page, limit),
      });
    }

    // Default: all qualified beneficiaries with received/eligible flag
    const [disbursements, qualifiedBeneficiaries] = await Promise.all([
      Disbursement.findAll({
        where: { programId: id },
        include: [
          { model: Beneficiary, as: "beneficiary", attributes: beneficiaryAttrs, include: [categoryInclude] },
          { model: User, as: "disbursedBy", attributes: ["id", "name"] },
        ],
      }),
      Beneficiary.findAll({
        where: { categoryId: { [Op.in]: programCategoryIds } },
        attributes: beneficiaryAttrs,
        include: [categoryInclude],
      }),
    ]);

    const disbursementMap = new Map(disbursements.map((d) => [d.beneficiaryId, d]));

    let combined = qualifiedBeneficiaries.map((b) => {
      const d = disbursementMap.get(b.id);
      return {
        ...b.toJSON(),
        status: d ? "received" : "eligible",
        disbursement: d
          ? { id: d.id, disbursedAt: d.disbursedAt, receiverName: d.receiverName, disbursedBy: d.disbursedBy }
          : null,
      };
    });

    if (search) {
      const s = search.toLowerCase();
      combined = combined.filter((b) =>
        b.beneficiaryNumber?.toLowerCase().includes(s) ||
        b.nationalId?.toLowerCase().includes(s) ||
        b.name?.toLowerCase().includes(s)
      );
    }

    const total = combined.length;
    const paged = combined.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      programName: program.name,
      status: "all",
      beneficiaries: paged,
      summary,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getProgramBeneficiaries,
};
