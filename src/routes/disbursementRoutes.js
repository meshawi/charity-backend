const express = require("express");
const router = express.Router();
const {
  getActivePrograms,
  checkEligibility,
  createDisbursement,
  getDisbursementById,
  getBeneficiaryDisbursements,
  getDisbursements,
  getAcknowledgmentPdf,
} = require("../controllers/disbursementController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/active-programs", authenticate, hasPermission("process_disbursement"), getActivePrograms);
router.post("/check-eligibility", authenticate, hasPermission("process_disbursement"), checkEligibility);
router.post("/", authenticate, hasPermission("process_disbursement"), createDisbursement);
router.get("/", authenticate, hasPermission("view_disbursements"), getDisbursements);
router.get("/beneficiary/:beneficiaryId", authenticate, hasPermission("view_disbursements"), getBeneficiaryDisbursements);
router.get("/:id", authenticate, hasPermission("view_disbursements"), getDisbursementById);
router.get("/:id/pdf", authenticate, hasPermission("view_disbursements"), getAcknowledgmentPdf);

module.exports = router;
