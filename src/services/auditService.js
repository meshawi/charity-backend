const { AuditLog } = require('../models');
const logger = require('../utils/logger');

class AuditService {
  async log({
    action,
    entityType,
    entityId = null,
    userId = null,
    userEmail = null,
    oldValues = null,
    newValues = null,
    metadata = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    errorMessage = null,
  }) {
    try {
      const auditLog = await AuditLog.create({
        action,
        entityType,
        entityId: entityId?.toString(),
        userId,
        userEmail,
        oldValues,
        newValues,
        metadata,
        ipAddress,
        userAgent,
        status,
        errorMessage,
      });

      logger.debug('Audit log created', { auditId: auditLog.id, action, entityType });
      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', { error: error.message, action, entityType });
      // Don't throw - audit logging should not break the main flow
    }
  }

  // Helper to extract request info
  getRequestInfo(req) {
    return {
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    };
  }

  // Common audit actions
  async logCreate(req, entityType, entityId, newValues) {
    return this.log({
      action: 'CREATE',
      entityType,
      entityId,
      newValues,
      ...this.getRequestInfo(req),
    });
  }

  async logUpdate(req, entityType, entityId, oldValues, newValues) {
    return this.log({
      action: 'UPDATE',
      entityType,
      entityId,
      oldValues,
      newValues,
      ...this.getRequestInfo(req),
    });
  }

  async logDelete(req, entityType, entityId, oldValues) {
    return this.log({
      action: 'DELETE',
      entityType,
      entityId,
      oldValues,
      ...this.getRequestInfo(req),
    });
  }

  async logLogin(req, userId, userEmail, success = true, errorMessage = null) {
    return this.log({
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: userId?.toString(),
      userId,
      userEmail,
      status: success ? 'success' : 'failure',
      errorMessage,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  }

  async logLogout(req) {
    return this.log({
      action: 'LOGOUT',
      entityType: 'AUTH',
      ...this.getRequestInfo(req),
    });
  }
}

module.exports = new AuditService();
