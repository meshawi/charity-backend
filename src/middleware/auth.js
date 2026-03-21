const jwt = require('jsonwebtoken');
const { User, Role, Permission } = require('../models');
const { AuthenticationError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      throw new AuthenticationError('يجب تسجيل الدخول');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: {
        model: Role,
        include: Permission,
      },
    });

    if (!user) {
      throw new AuthenticationError('المستخدم غير موجود');
    }

    // Collect all permissions from all roles
    const allPermissions = new Set();
    user.Roles.forEach(role => {
      role.Permissions.forEach(perm => {
        allPermissions.add(perm.name);
      });
    });

    req.user = user;
    req.userPermissions = Array.from(allPermissions);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate };
