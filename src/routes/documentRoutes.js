const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  uploadMiddleware,
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
} = require("../controllers/documentController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/", authenticate, hasPermission("view_profiles"), getDocuments);
router.post("/", authenticate, hasPermission("edit_profile"), uploadMiddleware, uploadDocument);
router.get("/:id/download", authenticate, hasPermission("view_profiles"), downloadDocument);
router.delete("/:id", authenticate, hasPermission("edit_profile"), deleteDocument);

module.exports = router;
