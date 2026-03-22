const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User, Role, Permission } = require("../models");
const { AuthenticationError } = require("../utils/errors");

const TOKEN_EXPIRY = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Helper to extract user data
const getUserData = (user) => {
  const allPermissions = new Map();
  user.Roles.forEach((role) => {
    role.Permissions.forEach((perm) => {
      allPermissions.set(perm.name, {
        name: perm.name,
        label: perm.label,
      });
    });
  });

  return {
    id: user.id,
    email: user.email,
    nationalId: user.nationalId,
    name: user.name,
    createdAt: user.createdAt,
    isSuperAdmin: user.isSuperAdmin || false,
    roles: user.Roles.map((r) => r.name),
    permissions: Array.from(allPermissions.values()),
  };
};

const login = async (req, res, next) => {
  try {
    const { email, nationalId, password } = req.body;
    const identifier = email || nationalId;

    // Build where clause based on provided identifier
    const whereClause = email
      ? { email }
      : { nationalId };

    const user = await User.findOne({
      where: whereClause,
      include: {
        model: Role,
        include: Permission,
      },
    });

    if (!user) {
      throw new AuthenticationError("بيانات الدخول غير صحيحة");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError(
        "تم تعطيل حسابك. يرجى التواصل مع المسؤول."
      );
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      throw new AuthenticationError("بيانات الدخول غير صحيحة");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "6h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: TOKEN_EXPIRY,
    });

    res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      user: getUserData(user),
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ success: true, message: "تم تسجيل الخروج بنجاح" });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: getUserData(req.user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, logout, me };
