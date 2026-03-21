const { User, Role } = require("../models");
const {
  ConflictError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
} = require("../utils/errors");
const auditService = require("../services/auditService");

const createUser = async (req, res, next) => {
  try {
    const { email, nationalId, password, name, roleIds } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictError("البريد الإلكتروني موجود بالفعل");
    }

    if (!nationalId) {
      throw new ValidationError("رقم الهوية مطلوب");
    }

    const existingNationalId = await User.findOne({ where: { nationalId } });
    if (existingNationalId) {
      throw new ConflictError("رقم الهوية موجود بالفعل");
    }

    const roles = await Role.findAll({ where: { id: roleIds } });
    if (roles.length !== roleIds.length) {
      throw new ValidationError("دور أو أكثر غير صالح");
    }

    const user = await User.create({ email, nationalId, password, name });
    await user.addRoles(roles);

    await auditService.logCreate(req, "USER", user.id, {
      email: user.email,
      nationalId: user.nationalId,
      name: user.name,
      roles: roles.map((r) => r.name),
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      user: {
        id: user.id,
        email: user.email,
        nationalId: user.nationalId,
        name: user.name,
        isActive: user.isActive,
        roles: roles.map((r) => r.name),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "nationalId", "name", "avatar", "isActive", "createdAt"],
      include: {
        model: Role,
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    });

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "email", "nationalId", "name", "isActive", "createdAt"],
      include: {
        model: Role,
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    });

    if (!user) {
      throw new NotFoundError("المستخدم غير موجود");
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, nationalId, name, isActive, roleIds } = req.body;

    // Protect the seeded admin (user id=1)
    if (parseInt(id) === 1 && req.user.id !== 1) {
      throw new AuthorizationError("لا يمكن تعديل بيانات مدير النظام الأساسي");
    }

    const user = await User.findByPk(id, {
      include: { model: Role, through: { attributes: [] } },
    });

    if (!user) {
      throw new NotFoundError("المستخدم غير موجود");
    }

    const oldValues = {
      email: user.email,
      nationalId: user.nationalId,
      name: user.name,
      isActive: user.isActive,
      roles: user.Roles.map((r) => r.name),
    };

    // Check email uniqueness if changing email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictError("البريد الإلكتروني موجود بالفعل");
      }
    }

    // Check nationalId uniqueness if changing
    if (nationalId && nationalId !== user.nationalId) {
      const existingNationalId = await User.findOne({ where: { nationalId } });
      if (existingNationalId) {
        throw new ConflictError("رقم الهوية موجود بالفعل");
      }
    }

    // Update user fields
    await user.update({
      ...(email && { email }),
      ...(nationalId !== undefined && { nationalId: nationalId || null }),
      ...(name && { name }),
      ...(isActive !== undefined && { isActive }),
    });

    // Update roles if provided
    if (roleIds) {
      const roles = await Role.findAll({ where: { id: roleIds } });
      if (roles.length !== roleIds.length) {
        throw new ValidationError("دور أو أكثر غير صالح");
      }
      await user.setRoles(roles);
    }

    // Reload user with roles
    await user.reload({
      include: { model: Role, through: { attributes: [] } },
    });

    const newValues = {
      email: user.email,
      nationalId: user.nationalId,
      name: user.name,
      isActive: user.isActive,
      roles: user.Roles.map((r) => r.name),
    };

    await auditService.logUpdate(req, "USER", user.id, oldValues, newValues);

    res.json({
      success: true,
      message: "تم تحديث المستخدم بنجاح",
      user: {
        id: user.id,
        email: user.email,
        nationalId: user.nationalId,
        name: user.name,
        isActive: user.isActive,
        roles: user.Roles.map((r) => ({ id: r.id, name: r.name })),
      },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    await user.update({ password: newPassword });

    await auditService.log({
      action: "CHANGE_PASSWORD",
      entityType: "USER",
      entityId: user.id,
      ...auditService.getRequestInfo(req),
    });

    // Clear the auth cookie to force logout
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مجدداً.",
    });
  } catch (error) {
    next(error);
  }
};

const adminResetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Protect the seeded admin (user id=1)
    if (parseInt(id) === 1 && req.user.id !== 1) {
      throw new AuthorizationError("لا يمكن إعادة تعيين كلمة مرور مدير النظام الأساسي");
    }

    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError("المستخدم غير موجود");
    }

    await user.update({ password: newPassword });

    await auditService.log({
      action: "ADMIN_RESET_PASSWORD",
      entityType: "USER",
      entityId: user.id,
      newValues: { targetUserEmail: user.email },
      ...auditService.getRequestInfo(req),
    });

    res.json({ success: true, message: `تم إعادة تعيين كلمة مرور ${user.email}` });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    const user = await User.findByPk(req.user.id);

    const oldValues = { avatar: user.avatar };
    await user.update({ avatar });

    await auditService.log({
      action: "UPDATE_PROFILE",
      entityType: "USER",
      entityId: user.id,
      oldValues,
      newValues: { avatar },
      ...auditService.getRequestInfo(req),
    });

    res.json({
      success: true,
      message: "تم تحديث الملف الشخصي بنجاح",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "name", "avatar", "createdAt"],
      include: {
        model: Role,
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changePassword,
  adminResetPassword,
  updateProfile,
  getProfile,
};
