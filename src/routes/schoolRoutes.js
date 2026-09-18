const express = require("express");
const router = express.Router();
const {
  getSchools,
  createSchool,
  importUnlisted,
  updateSchool,
  deleteSchool,
} = require("../controllers/schoolController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

// The list feeds the dependent form, so any signed-in user can read it
router.get("/", authenticate, getSchools);

// Managing the list is part of field settings
router.post("/", authenticate, hasPermission("manage_field_config"), createSchool);
router.post("/import-unlisted", authenticate, hasPermission("manage_field_config"), importUnlisted);
router.put("/:id", authenticate, hasPermission("manage_field_config"), updateSchool);
router.delete("/:id", authenticate, hasPermission("manage_field_config"), deleteSchool);

module.exports = router;
