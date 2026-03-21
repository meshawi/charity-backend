const express = require("express");
const router = express.Router();
const {
  getFilterFields,
  filterBeneficiaries,
  exportBeneficiariesReport,
  exportProgramsReport,
  exportEmployeesReport,
} = require("../controllers/reportController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

// Filter fields metadata (for building filter UI)
router.get(
  "/filter-fields",
  authenticate,
  getFilterFields
);

// Beneficiary filter (paginated JSON for beneficiary page)
router.post(
  "/beneficiaries/filter",
  authenticate,
  hasPermission("view_profiles"),
  filterBeneficiaries
);

// CSV Reports
router.post(
  "/beneficiaries/export",
  authenticate,
  hasPermission("view_reports"),
  exportBeneficiariesReport
);

router.post(
  "/programs/export",
  authenticate,
  hasPermission("view_reports"),
  exportProgramsReport
);

router.post(
  "/employees/export",
  authenticate,
  hasPermission("view_reports"),
  exportEmployeesReport
);

module.exports = router;
