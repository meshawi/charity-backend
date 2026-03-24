/**
 * JSON template builders for beneficiary financial data.
 * All income/obligation entries use { monthly, notes } (no yearly).
 */

/** Build an income object — only non-zero sources need values */
const buildIncome = (overrides = {}) => {
  const defaults = {
    salary: { monthly: 0, notes: "" },
    socialInsurance: { monthly: 0, notes: "" },
    modernSocialSecurity: { monthly: 0, notes: "" },
    citizenAccount: { monthly: 0, notes: "" },
    pension: { monthly: 0, notes: "" },
    disabilityAid: { monthly: 0, notes: "" },
    alimony: { monthly: 0, notes: "" },
    freelance: { monthly: 0, notes: "" },
    other: { monthly: 0, notes: "" },
  };
  for (const [k, v] of Object.entries(overrides)) {
    defaults[k] = { ...defaults[k], ...v };
  }
  return defaults;
};

/** Build an obligations object */
const buildObligations = (overrides = {}) => {
  const defaults = {
    rent: { monthly: 0, notes: "" },
    loanPayment: { monthly: 0, notes: "" },
    carInstallment: { monthly: 0, notes: "" },
    domesticWorker: { monthly: 0, notes: "" },
    other: { monthly: 0, notes: "" },
  };
  for (const [k, v] of Object.entries(overrides)) {
    defaults[k] = { ...defaults[k], ...v };
  }
  return defaults;
};

/** Build a full furniture appliances object */
const buildFurniture = (overrides = {}) => {
  const keys = [
    "windowAC", "splitAC", "washingMachines", "refrigerators", "fans",
    "freezers", "ovens", "heaters", "spaceHeaters", "computers",
    "phones", "tvScreens", "mattresses", "wardrobes", "blankets", "cars",
  ];
  const result = {};
  for (const k of keys) {
    result[k] = { good: 0, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "", ...(overrides[k] || {}) };
  }
  return result;
};

module.exports = { buildIncome, buildObligations, buildFurniture };
