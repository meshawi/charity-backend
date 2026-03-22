const { AuthorizationError } = require('../utils/errors');

const hasPermission = (...permissionNames) => {
  return (req, res, next) => {
    // SuperAdmin bypasses all permission checks
    if (req.user?.isSuperAdmin) return next();

    if (!req.userPermissions) {
      throw new AuthorizationError('تم رفض الوصول');
    }

    const hasRequired = permissionNames.some(perm => req.userPermissions.includes(perm));

    if (!hasRequired) {
      throw new AuthorizationError('صلاحيات غير كافية');
    }

    next();
  };
};

module.exports = { hasPermission };
