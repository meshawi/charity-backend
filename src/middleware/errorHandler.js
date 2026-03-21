const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const translateValidationMessage = (e) => {
      const field = e.path;
      const fieldLabels = {
        email: 'البريد الإلكتروني',
        nationalId: 'رقم الهوية',
        name: 'الإسم',
        password: 'كلمة المرور',
        phone: 'رقم الجوال',
      };
      const label = fieldLabels[field] || field;

      if (e.type === 'unique violation') return `${label} موجود بالفعل`;
      if (e.validatorKey === 'len') return `${label} يجب أن يكون بالطول المحدد`;
      if (e.validatorKey === 'isNumeric') return `${label} يجب أن يكون رقمياً`;
      if (e.validatorKey === 'isEmail') return `البريد الإلكتروني غير صالح`;
      if (e.validatorKey === 'notNull') return `${label} مطلوب`;
      if (e.validatorKey === 'notEmpty') return `${label} لا يمكن أن يكون فارغاً`;
      if (e.validatorKey === 'isIn') return `قيمة ${label} غير صالحة`;
      if (e.validatorKey === 'min') return `${label} أقل من الحد المسموح`;
      if (e.validatorKey === 'max') return `${label} أكبر من الحد المسموح`;
      return `${label} غير صالح`;
    };

    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'فشل التحقق من البيانات',
      details: err.errors?.map(e => ({ field: e.path, message: translateValidationMessage(e) })),
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'AUTHENTICATION_ERROR',
      message: err.name === 'TokenExpiredError' ? 'انتهت صلاحية الجلسة' : 'جلسة غير صالحة',
    });
  }

  // Handle operational errors (our custom errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Handle unknown errors
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'خطأ داخلي في الخادم' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message,
  });
};

module.exports = errorHandler;
