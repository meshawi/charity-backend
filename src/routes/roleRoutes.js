const express = require("express");
const router = express.Router();
const { getRoles, getPermissions, createRole, updateRole, deleteRole } = require("../controllers/roleController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/permissions", authenticate, hasPermission("manage_roles"), getPermissions);
router.get("/", authenticate, hasPermission("manage_roles"), getRoles);
router.post("/", authenticate, hasPermission("manage_roles"), createRole);
router.put("/:id", authenticate, hasPermission("manage_roles"), updateRole);
router.delete("/:id", authenticate, hasPermission("manage_roles"), deleteRole);

module.exports = router;
