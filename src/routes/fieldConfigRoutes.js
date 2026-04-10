const express = require("express");
const router = express.Router();
const {
  getFieldConfigs,
  updateFieldConfig,
  bulkUpdateFieldConfigs,
  createCustomField,
  deleteCustomField,
} = require("../controllers/fieldConfigController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/", authenticate, hasPermission("manage_field_config"), getFieldConfigs);
router.post("/", authenticate, hasPermission("manage_field_config"), createCustomField);
router.put("/bulk", authenticate, hasPermission("manage_field_config"), bulkUpdateFieldConfigs);
router.put("/:id", authenticate, hasPermission("manage_field_config"), updateFieldConfig);
router.delete("/:id", authenticate, hasPermission("manage_field_config"), deleteCustomField);

module.exports = router;
