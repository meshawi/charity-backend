const express = require("express");
const router = express.Router();
const {
  lookupBeneficiary,
  createPledge,
  getPledgePdf,
  getPledges,
} = require("../controllers/pledgeController");
const { authenticate } = require("../middleware/auth");
const { hasPermission } = require("../middleware/permission");

router.get("/lookup", authenticate, hasPermission("process_pledge"), lookupBeneficiary);
router.post("/", authenticate, hasPermission("process_pledge"), createPledge);
router.get("/", authenticate, hasPermission("view_pledges"), getPledges);
router.get("/:id/pdf", authenticate, hasPermission("view_pledges"), getPledgePdf);

module.exports = router;
