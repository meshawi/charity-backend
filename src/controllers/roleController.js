const { Role, Permission } = require("../models");
const { NotFoundError } = require("../utils/errors");

const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      include: {
        model: Permission,
        attributes: ["id", "name", "label", "description"],
        through: { attributes: [] },
      },
      order: [["name", "ASC"]],
    });

    res.json({ success: true, roles });
  } catch (error) {
    next(error);
  }
};

const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: {
        model: Permission,
        attributes: ["id", "name", "label", "description"],
        through: { attributes: [] },
      },
    });

    if (!role) throw new NotFoundError("الدور غير موجود");

    res.json({ success: true, role });
  } catch (error) {
    next(error);
  }
};

const getPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.findAll({
      attributes: ["id", "name", "label", "description"],
      order: [["label", "ASC"]],
    });

    res.json({ success: true, permissions });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRoles, getRoleById, getPermissions };
