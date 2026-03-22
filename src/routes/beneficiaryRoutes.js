const express = require("express");
const router = express.Router();
const {
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  assignCategory,
  getCategoryHistory,
  submitForReview,
  getReviewQueue,
  returnBeneficiary,
  getBeneficiaryProgress,
} = require("../controllers/beneficiaryController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

// Review queue (must be before /:id routes)
router.get("/review-queue", authenticate, hasPermission("assign_category"), getReviewQueue);

router.get("/", authenticate, hasPermission("view_profiles"), getBeneficiaries);
router.get("/:id", authenticate, hasPermission("view_profiles"), getBeneficiaryById);
router.get("/:id/progress", authenticate, hasPermission("view_profiles"), getBeneficiaryProgress);
router.post("/", authenticate, hasPermission("create_profile"), createBeneficiary);
router.put("/:id", authenticate, hasPermission("edit_profile"), updateBeneficiary);
router.delete("/:id", authenticate, hasPermission("delete_profile"), deleteBeneficiary);

// Review workflow
router.post("/:id/submit-review", authenticate, hasPermission("edit_profile"), submitForReview);
router.post("/:id/return", authenticate, hasPermission("assign_category"), returnBeneficiary);

// Category assignment (dedicated permission)
router.put("/:id/category", authenticate, hasPermission("assign_category"), assignCategory);
router.get("/:id/category-history", authenticate, hasPermission("view_profiles"), getCategoryHistory);

module.exports = router;
