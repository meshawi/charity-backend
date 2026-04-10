const { FieldConfig } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");

const VALID_FIELD_TYPES = ["text", "number", "date", "select", "boolean"];

// Get all field configs (active only by default)
const getFieldConfigs = async (req, res, next) => {
  try {
    const { fieldGroup, includeInactive } = req.query;
    const where = {};
    if (fieldGroup) where.fieldGroup = fieldGroup;
    if (includeInactive !== "true") where.isActive = true;

    const configs = await FieldConfig.findAll({
      where,
      order: [["isCustom", "ASC"], ["fieldGroup", "ASC"], ["fieldLabel", "ASC"]],
    });

    res.json({ success: true, configs });
  } catch (error) {
    next(error);
  }
};

// Update required status of a field (+ label/type/options for custom fields)
const updateFieldConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isRequired, fieldLabel, fieldType, options, isActive } = req.body;

    const config = await FieldConfig.findByPk(id);
    if (!config) {
      throw new NotFoundError("الحقل غير موجود");
    }

    // nationalId is always required
    if (config.fieldName === "nationalId" && isRequired === false) {
      throw new ValidationError("رقم الهوية لا يمكن أن يكون اختياري");
    }

    const updateData = {};
    if (isRequired !== undefined) updateData.isRequired = isRequired;

    // Only custom fields can change label/type/options/active
    if (config.isCustom) {
      if (fieldLabel !== undefined) updateData.fieldLabel = fieldLabel;
      if (fieldType !== undefined) {
        if (!VALID_FIELD_TYPES.includes(fieldType)) {
          throw new ValidationError("نوع الحقل غير صالح");
        }
        updateData.fieldType = fieldType;
      }
      if (options !== undefined) updateData.options = options;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    await config.update(updateData);

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
      throw new ValidationError("البيانات غير صحيحة");
    }

    for (const { id, isRequired } of updates) {
      const config = await FieldConfig.findByPk(id);
      if (!config) continue;

      // nationalId always required
      if (config.fieldName === "nationalId" && !isRequired) continue;

      await config.update({ isRequired });
    }

    const configs = await FieldConfig.findAll({
      where: { isActive: true },
      order: [["isCustom", "ASC"], ["fieldGroup", "ASC"], ["fieldLabel", "ASC"]],
    });

    res.json({ success: true, configs });
  } catch (error) {
    next(error);
  }
};

// Create a new custom field
const createCustomField = async (req, res, next) => {
  try {
    const { fieldName, fieldLabel, fieldGroup, fieldType, options, isRequired } = req.body;

    if (!fieldName || !fieldName.trim()) {
      throw new ValidationError("اسم الحقل مطلوب");
    }
    if (!fieldLabel || !fieldLabel.trim()) {
      throw new ValidationError("عنوان الحقل بالعربي مطلوب");
    }
    if (!fieldGroup || !["beneficiary", "dependent"].includes(fieldGroup)) {
      throw new ValidationError("مجموعة الحقل يجب أن تكون beneficiary أو dependent");
    }
    if (fieldType && !VALID_FIELD_TYPES.includes(fieldType)) {
      throw new ValidationError("نوع الحقل غير صالح");
    }
    if (fieldType === "select" && (!Array.isArray(options) || options.length === 0)) {
      throw new ValidationError("حقل الاختيار يتطلب قائمة خيارات");
    }

    // Sanitize fieldName: allow only letters, numbers, underscores
    const safeName = fieldName.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!safeName || safeName.length < 2) {
      throw new ValidationError("اسم الحقل يجب أن يحتوي على حرفين على الأقل (أحرف إنجليزية وأرقام و _ فقط)");
    }

    // Check for duplicate
    const existing = await FieldConfig.findOne({
      where: { fieldName: safeName, fieldGroup },
    });
    if (existing) {
      throw new ValidationError("اسم الحقل مستخدم مسبقاً في هذه المجموعة");
    }

    const config = await FieldConfig.create({
      fieldName: safeName,
      fieldLabel: fieldLabel.trim(),
      fieldGroup,
      fieldType: fieldType || "text",
      options: fieldType === "select" ? options : null,
      isRequired: isRequired || false,
      isCustom: true,
      isActive: true,
    });

    res.status(201).json({ success: true, config });
  } catch (error) {
    next(error);
  }
};

// Soft-delete (deactivate) a custom field
const deleteCustomField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const config = await FieldConfig.findByPk(id);
    if (!config) throw new NotFoundError("الحقل غير موجود");

    if (!config.isCustom) {
      throw new ValidationError("لا يمكن حذف حقل أساسي في النظام");
    }

    await config.update({ isActive: false, isRequired: false });

    res.json({ success: true, message: "تم تعطيل الحقل المخصص" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFieldConfigs,
  updateFieldConfig,
  bulkUpdateFieldConfigs,
  createCustomField,
  deleteCustomField,
};
