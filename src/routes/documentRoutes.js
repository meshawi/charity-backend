const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  uploadMiddleware,
  uploadDocument,
  viewDocument,
  deleteDocument,
  getDocumentTypes,
} = require("../controllers/documentController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/types", authenticate, getDocumentTypes);
router.post("/", authenticate, hasPermission("edit_profile"), uploadMiddleware, uploadDocument);
router.get("/:id/view", authenticate, hasPermission("view_profiles"), viewDocument);
router.delete("/:id", authenticate, hasPermission("edit_profile"), deleteDocument);

module.exports = router;
