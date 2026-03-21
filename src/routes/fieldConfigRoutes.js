const express = require("express");
const router = express.Router();
const {
  getFieldConfigs,
  updateFieldConfig,
  bulkUpdateFieldConfigs,
} = require("../controllers/fieldConfigController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/", authenticate, hasPermission("manage_field_config"), getFieldConfigs);
router.put("/bulk", authenticate, hasPermission("manage_field_config"), bulkUpdateFieldConfigs);
router.put("/:id", authenticate, hasPermission("manage_field_config"), updateFieldConfig);

module.exports = router;
