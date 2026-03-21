const express = require("express");
const router = express.Router();
const { getRoles, getRoleById, getPermissions } = require("../controllers/roleController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/permissions", authenticate, hasPermission("manage_roles"), getPermissions);
router.get("/", authenticate, hasPermission("manage_roles"), getRoles);
router.get("/:id", authenticate, hasPermission("manage_roles"), getRoleById);

module.exports = router;
