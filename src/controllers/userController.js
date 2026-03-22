const { User, Role, Permission } = require("../models");
const {
  ConflictError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
} = require("../utils/errors");
const { SUPER_ADMIN_ROLE } = require("../utils/constants");

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
      attributes: ["id", "email", "nationalId", "name", "isActive", "isSuperAdmin", "createdAt"],
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

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, nationalId, name, isActive, roleIds } = req.body;

    // Protect the super admin — only the super admin themselves can edit their own record
    const targetUser = await User.findByPk(id, {
      include: { model: Role, through: { attributes: [] } },
    });

    if (!targetUser) {
      throw new NotFoundError("المستخدم غير موجود");
    }

    if (targetUser.isSuperAdmin && req.user.id !== targetUser.id) {
      throw new AuthorizationError("لا يمكن تعديل بيانات مدير النظام الأساسي");
    }

    // Nobody can change SuperAdmin's roles or deactivate them
    if (targetUser.isSuperAdmin) {
      if (roleIds !== undefined) {
        throw new AuthorizationError("لا يمكن تغيير أدوار مدير النظام الأساسي");
      }
      if (isActive === false) {
        throw new AuthorizationError("لا يمكن تعطيل حساب مدير النظام الأساسي");
      }
    }

    const user = targetUser;

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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError("كلمة المرور الحالية والجديدة مطلوبتان");
    }

    const user = await User.findByPk(req.user.id);

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AuthenticationError("كلمة المرور الحالية غير صحيحة");
    }

    await user.update({ password: newPassword });

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

    if (!newPassword) throw new ValidationError("كلمة المرور الجديدة مطلوبة");

    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError("المستخدم غير موجود");

    // Nobody can reset SuperAdmin's password through this endpoint
    if (user.isSuperAdmin) {
      throw new AuthorizationError("لا يمكن إعادة تعيين كلمة مرور مدير النظام الأساسي");
    }

    await user.update({ password: newPassword });

    res.json({ success: true, message: `تم إعادة تعيين كلمة مرور ${user.email}` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  changePassword,
  adminResetPassword,
};
