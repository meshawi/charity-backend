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
} = require("../controllers/beneficiaryController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/", authenticate, hasPermission("view_profiles"), getBeneficiaries);
router.get("/:id", authenticate, hasPermission("view_profiles"), getBeneficiaryById);
router.post("/", authenticate, hasPermission("create_profile"), createBeneficiary);
router.put("/:id", authenticate, hasPermission("edit_profile"), updateBeneficiary);
router.delete("/:id", authenticate, hasPermission("delete_profile"), deleteBeneficiary);

// Category assignment (dedicated permission)
router.put("/:id/category", authenticate, hasPermission("assign_category"), assignCategory);
router.get("/:id/category-history", authenticate, hasPermission("view_profiles"), getCategoryHistory);

module.exports = router;
