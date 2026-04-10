const { Op } = require("sequelize");
const { Role, Permission } = require("../models");
const { NotFoundError, ValidationError, AuthorizationError } = require("../utils/errors");
const { SUPER_ADMIN_ROLE } = require("../utils/constants");

const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      where: { name: { [Op.ne]: SUPER_ADMIN_ROLE } },
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

const createRole = async (req, res, next) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name || !name.trim()) throw new ValidationError("اسم الدور مطلوب");

    if (name.trim() === SUPER_ADMIN_ROLE) {
      throw new AuthorizationError("لا يمكن إنشاء دور بنفس اسم مدير النظام");
    }

    const existing = await Role.findOne({ where: { name: name.trim() } });
    if (existing) throw new ValidationError("اسم الدور موجود بالفعل");

    if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      throw new ValidationError("يجب تحديد صلاحية واحدة على الأقل");
    }

    const permissions = await Permission.findAll({ where: { id: permissionIds } });
    if (permissions.length !== permissionIds.length) {
      throw new ValidationError("صلاحية أو أكثر غير صالحة");
    }

    const role = await Role.create({ name: name.trim(), description: description || null });
    await role.addPermissions(permissions);

    const fullRole = await Role.findByPk(role.id, {
      include: {
        model: Permission,
        attributes: ["id", "name", "label", "description"],
        through: { attributes: [] },
      },
    });

    res.status(201).json({ success: true, role: fullRole });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    const role = await Role.findByPk(id, {
      include: { model: Permission, through: { attributes: [] } },
    });
    if (!role) throw new NotFoundError("الدور غير موجود");

    // Protect admin role
    if (role.name === SUPER_ADMIN_ROLE) {
      throw new AuthorizationError("لا يمكن تعديل دور مدير النظام");
    }

    // If renaming, ensure not renamed to admin
    if (name && name.trim() !== role.name) {
      if (name.trim() === SUPER_ADMIN_ROLE) {
        throw new AuthorizationError("لا يمكن استخدام اسم مدير النظام");
      }
      const existing = await Role.findOne({ where: { name: name.trim() } });
      if (existing) throw new ValidationError("اسم الدور موجود بالفعل");
    }

    await role.update({
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description }),
    });

    if (permissionIds && Array.isArray(permissionIds)) {
      if (permissionIds.length === 0) {
        throw new ValidationError("يجب تحديد صلاحية واحدة على الأقل");
      }
      const permissions = await Permission.findAll({ where: { id: permissionIds } });
      if (permissions.length !== permissionIds.length) {
        throw new ValidationError("صلاحية أو أكثر غير صالحة");
      }
      await role.setPermissions(permissions);
    }

    await role.reload({
      include: {
        model: Permission,
        attributes: ["id", "name", "label", "description"],
        through: { attributes: [] },
      },
    });

    res.json({ success: true, role });
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, {
      include: { model: Permission, through: { attributes: [] } },
    });
    if (!role) throw new NotFoundError("الدور غير موجود");

    // Protect admin role
    if (role.name === SUPER_ADMIN_ROLE) {
      throw new AuthorizationError("لا يمكن حذف دور مدير النظام");
    }

    await role.destroy();

    res.json({ success: true, message: "تم حذف الدور" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRoles, getPermissions, createRole, updateRole, deleteRole };
