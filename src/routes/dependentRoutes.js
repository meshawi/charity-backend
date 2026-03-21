const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  getDependents,
  createDependent,
  updateDependent,
  deleteDependent,
} = require("../controllers/dependentController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/", authenticate, hasPermission("view_profiles"), getDependents);
router.post("/", authenticate, hasPermission("edit_profile"), createDependent);
router.put("/:dependentId", authenticate, hasPermission("edit_profile"), updateDependent);
router.delete("/:dependentId", authenticate, hasPermission("edit_profile"), deleteDependent);

module.exports = router;
