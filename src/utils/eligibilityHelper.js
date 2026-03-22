const { Op } = require("sequelize");
const { Beneficiary, Disbursement, Dependent } = require("../models");

/**
 * Check if a beneficiary or any family member has already received from a program.
 * Returns { blocked: true, reason: "..." } or { blocked: false }.
 */
const checkFamilyEligibility = async (beneficiary, programId) => {
  // Check if beneficiary already received
  const existing = await Disbursement.findOne({
    where: { beneficiaryId: beneficiary.id, programId },
  });
  if (existing) {
    return {
      blocked: true,
      reason: `تم الصرف مسبقاً بتاريخ ${new Date(existing.disbursedAt).toLocaleDateString("ar-SA")}`,
    };
  }

  const dependentNationalIds = (beneficiary.dependents || [])
    .map((d) => d.nationalId)
    .filter(Boolean);

  if (dependentNationalIds.length > 0) {
    // Check if any dependent is a beneficiary who received
    const depAsBeneficiaries = await Beneficiary.findAll({
      where: { nationalId: { [Op.in]: dependentNationalIds } },
      attributes: ["id", "name"],
    });
    if (depAsBeneficiaries.length > 0) {
      const depBIds = depAsBeneficiaries.map((b) => b.id);
      const depDisbursement = await Disbursement.findOne({
        where: { beneficiaryId: { [Op.in]: depBIds }, programId },
        include: [{ model: Beneficiary, as: "beneficiary", attributes: ["name"] }],
      });
      if (depDisbursement) {
        return {
          blocked: true,
          reason: `أحد أفراد الأسرة (${depDisbursement.beneficiary.name}) استلم من هذا البرنامج مسبقاً`,
        };
      }
    }

    // Check if any dependent is under another beneficiary who received
    const otherDeps = await Dependent.findAll({
      where: {
        nationalId: { [Op.in]: dependentNationalIds },
        beneficiaryId: { [Op.ne]: beneficiary.id },
      },
      attributes: ["beneficiaryId"],
    });
    if (otherDeps.length > 0) {
      const otherBIds = [...new Set(otherDeps.map((d) => d.beneficiaryId))];
      const familyDisb = await Disbursement.findOne({
        where: { beneficiaryId: { [Op.in]: otherBIds }, programId },
        include: [{ model: Beneficiary, as: "beneficiary", attributes: ["name"] }],
      });
      if (familyDisb) {
        return {
          blocked: true,
          reason: `أحد أفراد الأسرة مسجل تحت مستفيد آخر (${familyDisb.beneficiary.name}) استلم من هذا البرنامج مسبقاً`,
        };
      }
    }
  }

  // Check if beneficiary is registered as a dependent under someone who received
  const selfAsDep = await Dependent.findAll({
    where: { nationalId: beneficiary.nationalId },
    attributes: ["beneficiaryId"],
  });
  if (selfAsDep.length > 0) {
    const parentIds = selfAsDep.map((d) => d.beneficiaryId);
    const parentDisb = await Disbursement.findOne({
      where: { beneficiaryId: { [Op.in]: parentIds }, programId },
      include: [{ model: Beneficiary, as: "beneficiary", attributes: ["name"] }],
    });
    if (parentDisb) {
      return {
        blocked: true,
        reason: `المستفيد مسجل كتابع لدى مستفيد آخر (${parentDisb.beneficiary.name}) استلم من هذا البرنامج مسبقاً`,
      };
    }
  }

  return { blocked: false };
};

module.exports = { checkFamilyEligibility };
