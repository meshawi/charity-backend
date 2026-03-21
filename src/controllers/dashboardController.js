const { Op, fn, col, literal } = require("sequelize");
const {
  Beneficiary,
  User,
  Category,
  AuditLog,
  Disbursement,
  Program,
  sequelize,
} = require("../models");

const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const totalUsers = await User.count();
    const totalProfiles = await Beneficiary.count();
    const profilesThisMonth = await Beneficiary.count({
      where: { createdAt: { [Op.gte]: monthAgo } },
    });

    // Profiles by category
    const allCategories = await Category.findAll({
      attributes: ["id", "name", "color"],
    });
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    const categoryCounts = await Beneficiary.findAll({
      attributes: [
        "categoryId",
        [fn("COUNT", col("id")), "count"],
      ],
      where: { categoryId: { [Op.ne]: null } },
      group: ["categoryId"],
      raw: true,
    });

    const profilesByCategory = categoryCounts.map((c) => {
      const cat = categoryMap.get(c.categoryId);
      return {
        categoryId: c.categoryId,
        name: cat?.name || "غير محدد",
        color: cat?.color || "#888",
        count: parseInt(c.count),
      };
    });

    // Disbursement stats
    const totalDisbursements = await Disbursement.count();
    const disbursementsThisMonth = await Disbursement.count({
      where: { disbursedAt: { [Op.gte]: monthAgo } },
    });
    const disbursementsToday = await Disbursement.count({
      where: { disbursedAt: { [Op.gte]: today } },
    });

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers },
        profiles: {
          total: totalProfiles,
          newThisMonth: profilesThisMonth,
          byCategory: profilesByCategory,
        },
        disbursements: {
          total: totalDisbursements,
          thisMonth: disbursementsThisMonth,
          today: disbursementsToday,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const logs = await AuditLog.findAll({
      where: {
        action: { [Op.in]: ["CREATE", "UPDATE", "DELETE"] },
        entityType: { [Op.in]: ["PROFILE", "DEPENDENT", "DISBURSEMENT"] },
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    const activities = logs.map((log) => ({
      id: log.id,
      user: log.userEmail || "النظام",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      time: log.createdAt,
    }));

    res.json({ success: true, activities });
  } catch (error) {
    next(error);
  }
};

const getRecentProfiles = async (req, res, next) => {
  try {
    const profiles = await Beneficiary.findAll({
      include: [
        { model: User, as: "createdBy", attributes: ["id", "name"] },
        { model: Category, as: "category", attributes: ["id", "name", "color"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    res.json({ success: true, profiles });
  } catch (error) {
    next(error);
  }
};

const getDailyStats = async (req, res, next) => {
  try {
    const days = [7, 30, 90].includes(parseInt(req.query.days))
      ? parseInt(req.query.days)
      : 7;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const [beneficiaryRows, disbursementRows] = await Promise.all([
      Beneficiary.findAll({
        attributes: [
          [fn("DATE", col("createdAt")), "date"],
          [fn("COUNT", col("id")), "count"],
        ],
        where: { createdAt: { [Op.gte]: since } },
        group: [fn("DATE", col("createdAt"))],
        order: [[fn("DATE", col("createdAt")), "ASC"]],
        raw: true,
      }),
      Disbursement.findAll({
        attributes: [
          [fn("DATE", col("disbursedAt")), "date"],
          [fn("COUNT", col("id")), "count"],
        ],
        where: { disbursedAt: { [Op.gte]: since } },
        group: [fn("DATE", col("disbursedAt"))],
        order: [[fn("DATE", col("disbursedAt")), "ASC"]],
        raw: true,
      }),
    ]);

    // Build lookup maps
    const benMap = new Map(beneficiaryRows.map((r) => [r.date, parseInt(r.count)]));
    const disMap = new Map(disbursementRows.map((r) => [r.date, parseInt(r.count)]));

    // Fill every day in range (no gaps)
    const data = [];
    const cursor = new Date(since);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10);
      data.push({
        date: dateStr,
        beneficiaries: benMap.get(dateStr) || 0,
        disbursements: disMap.get(dateStr) || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getRecentActivity, getRecentProfiles, getDailyStats };
