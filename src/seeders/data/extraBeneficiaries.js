/**
 * Generator for 40 additional historical beneficiaries (2025-2026).
 * Produces BNIF-XXXXXX numbered entries with the updated schema
 * (no yearly, expanded buildingOwnership, some with nextUpdate).
 */
const { buildIncome, buildObligations } = require("./financialTemplates");
const { daysFromNow } = require("./dummyData");

const firstNames = [
  "محمد", "أحمد", "خالد", "سعود", "عمر", "يوسف", "إبراهيم", "عبدالعزيز",
  "ناصر", "فهد", "بندر", "ماجد", "سلطان", "فيصل", "عبدالرحمن",
  "نوف", "هند", "سارة", "فاطمة", "ريم", "لمى", "مريم", "عائشة", "أمل",
  "تركي", "عبدالله", "صالح", "حمد", "مشعل", "منيرة", "العنود", "دلال",
  "راشد", "حسن", "عادل", "وليد", "طارق", "زياد", "بدر", "نايف",
];

const lastNames = [
  "الشمري", "الحربي", "المالكي", "الشهري", "العمري", "الزهراني",
  "البلوي", "المطيري", "الرشيدي", "السبيعي", "الجهني", "العنزي",
  "الدوسري", "السلمي", "القرني", "الغامدي", "القحطاني", "العتيبي",
];

const genders = ["male", "female"];
const maritalStatuses = ["married", "single", "divorced", "widowed"];
const areas = [
  "aldeira", "aladwa", "alrashidia", "alabadia",
  "alsaadoon", "aliskan", "aldahia", "aldana",
];
const ownerships = ["private", "shared", "rented", "charity_house", "developmental_housing"];
const buildTypes = ["arabic", "concrete"];
const buildConditions = ["good", "average", "needs_repair"];
const buildCapacities = ["small", "medium", "sufficient"];

const EXTRA_COUNT = 40;

/**
 * Build 40 historical beneficiaries.
 * @param {number[]} catIds  – array of created category IDs (6 entries)
 * @param {number[]} creatorIds – array of user IDs that can be createdById
 * @param {number}   startSeq  – the next BNIF sequence number to use (e.g. 10)
 * @returns {object[]} beneficiary plain objects ready for bulkCreate
 */
function buildExtraBeneficiaries(catIds, creatorIds, startSeq) {
  const genStart = new Date("2025-01-15").getTime();
  const genEnd = new Date("2026-03-15").getTime();
  const genStep = (genEnd - genStart) / EXTRA_COUNT;

  const incomeKeys = [
    "salary", "socialInsurance", "modernSocialSecurity",
    "citizenAccount", "pension", "disabilityAid",
  ];
  const oblKeys = ["rent", "loanPayment", "carInstallment", "domesticWorker"];

  const result = [];

  for (let i = 0; i < EXTRA_COUNT; i++) {
    const dt = new Date(genStart + genStep * i);
    const seq = startSeq + i;
    const num = `BNIF-${String(seq).padStart(6, "0")}`;

    // Status
    let status = "approved";
    let categoryId = catIds[i % catIds.length];
    let phone = `050${String(1000001 + i)}`;
    let bank = i % 2 === 0 ? "الراجحي" : "الأهلي";
    let name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;

    // Indices 30-33: no name
    if (i >= 30 && i <= 33) name = null;

    // Indices 36-37: draft
    if (i >= 36 && i <= 37) {
      status = "draft";
      categoryId = null;
      phone = null;
      bank = null;
      name = null;
    } else if (i >= 38 && i <= 39) {
      // Indices 38-39: pending review
      status = "pending_review";
    }

    // Random-ish income & obligations (no yearly)
    const incOver = {};
    const incKey = incomeKeys[i % incomeKeys.length];
    incOver[incKey] = { monthly: 800 + (i * 151) % 2000 };
    if (i % 5 === 0) incOver.freelance = { monthly: 300 + (i * 97) % 700 };

    const oblOver = {};
    const oblKey = oblKeys[i % oblKeys.length];
    oblOver[oblKey] = { monthly: 500 + (i * 131) % 2500 };

    // nextUpdate on ~10 beneficiaries (indices 0-4 past, 5-9 within 30 days)
    let nextUpdate = undefined;
    let updateDone = undefined;
    if (i < 5) {
      // already passed → need update
      nextUpdate = daysFromNow(-90 + i * 10);
      updateDone = daysFromNow(-365);
    } else if (i >= 5 && i < 10) {
      // within 30 days → need update
      nextUpdate = daysFromNow(3 + i * 3);
      updateDone = daysFromNow(-180);
    }

    result.push({
      beneficiaryNumber: num,
      name,
      nationalId: `109890${String(i + 1).padStart(4, "0")}`,
      gender: genders[i % 2],
      dateOfBirth: `${1970 + (i % 30)}-${String((i % 12) + 1).padStart(2, "0")}-15`,
      maritalStatus: maritalStatuses[i % maritalStatuses.length],
      phone,
      familyCount: 2 + (i % 5),
      dependentsCount: 1 + (i % 4),
      bank,
      residenceArea: areas[i % areas.length],
      buildingOwnership: ownerships[i % ownerships.length],
      buildingType: buildTypes[i % buildTypes.length],
      buildingCondition: buildConditions[i % buildConditions.length],
      buildingCapacity: buildCapacities[i % buildCapacities.length],
      incomeSources: buildIncome(incOver),
      financialObligations: buildObligations(oblOver),
      nextUpdate,
      updateDone,
      categoryId,
      status,
      createdById: creatorIds[i % creatorIds.length],
      createdAt: dt,
      updatedAt: dt,
    });
  }

  return result;
}

module.exports = { buildExtraBeneficiaries, EXTRA_COUNT };
