const { FieldConfig } = require("../models");
const auditService = require("../services/auditService");

// Get all field configs
const getFieldConfigs = async (req, res, next) => {
  try {
    const { fieldGroup } = req.query;
    const where = {};
    if (fieldGroup) where.fieldGroup = fieldGroup;

    const configs = await FieldConfig.findAll({
      where,
      order: [["fieldGroup", "ASC"], ["fieldLabel", "ASC"]],
    });

    res.json({ success: true, configs });
  } catch (error) {
    next(error);
  }
};

// Update required status of a field
const updateFieldConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isRequired } = req.body;

    const config = await FieldConfig.findByPk(id);
    if (!config) {
      return res.status(404).json({ success: false, message: "الحقل غير موجود" });
    }

    // nationalId is always required
    if (config.fieldName === "nationalId" && !isRequired) {
      return res.status(400).json({
        success: false,
        message: "رقم الهوية لا يمكن أن يكون اختياري",
      });
    }

    const oldValue = config.isRequired;
    await config.update({ isRequired });

    await auditService.logUpdate(req, "FIELD_CONFIG", config.id, { isRequired: oldValue }, { isRequired });

    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

// Bulk update required fields
const bulkUpdateFieldConfigs = async (req, res, next) => {
  try {
    const { updates } = req.body; // [{ id, isRequired }]
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "البيانات غير صحيحة" });
    }

    for (const { id, isRequired } of updates) {
      const config = await FieldConfig.findByPk(id);
      if (!config) continue;

      // nationalId always required
      if (config.fieldName === "nationalId" && !isRequired) continue;

      await config.update({ isRequired });
    }

    const configs = await FieldConfig.findAll({
      order: [["fieldGroup", "ASC"], ["fieldLabel", "ASC"]],
    });

    res.json({ success: true, configs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFieldConfigs,
  updateFieldConfig,
  bulkUpdateFieldConfigs,
};
