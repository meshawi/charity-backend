/**
 * Dummy data builders for beneficiaries, dependents, and disbursements.
 * Separated from the main seeder for readability.
 */
const { buildIncome, buildObligations, buildFurniture } = require("./financialTemplates");

// ── Helper: date string N days from "today" (2026-03-24) ──
const daysFromNow = (days) => {
  const d = new Date("2026-03-24");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

// ── Categories & Programs metadata (for brevity, wired by index in the seeder) ──

const categoriesData = [
  { name: "أ", description: "الفئة أ", color: "#3b82f6" },
  { name: "ب", description: "الفئة ب", color: "#ef4444" },
  { name: "ت", description: "الفئة ت", color: "#10b981" },
  { name: "ج", description: "الفئة ج", color: "#f59e0b" },
  { name: "د", description: "الفئة د", color: "#8b5cf6" },
  { name: "و", description: "الفئة و", color: "#ec4899" },
];

const programsData = [
  {
    name: "دعم شهري",
    description: "برنامج دعم مالي شهري للمستفيدين",
    startDate: "2025-01-01",
    endDate: "2026-12-31",
    isActive: true,
    categoryIndices: [0, 1],
  },
  {
    name: "كسوة الشتاء",
    description: "برنامج كسوة الشتاء السنوي",
    startDate: "2025-10-01",
    endDate: "2026-03-31",
    isActive: true,
    categoryIndices: [0, 2, 3],
  },
  {
    name: "سلة غذائية",
    description: "توزيع سلال غذائية رمضانية",
    startDate: "2026-02-15",
    endDate: "2026-04-15",
    isActive: true,
    categoryIndices: [1, 4],
  },
  {
    name: "إعانة إيجار",
    description: "دعم إيجارات السكن للمحتاجين",
    startDate: "2025-06-01",
    endDate: "2026-06-01",
    isActive: true,
    categoryIndices: [0, 2, 5], // includes أ for test beneficiary
  },
  {
    name: "برنامج منتهي",
    description: "برنامج قديم انتهت صلاحيته",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    isActive: false,
    categoryIndices: [3],
  },
];

// ── 9 handcrafted beneficiaries ──

const buildCoreBeneficiaries = (catIds, userIds) => {
  const [admin, , researcher, , reviewer, usersMgr] = userIds;

  return [
    {
      beneficiaryNumber: "BNIF-000001",
      createdAt: new Date("2025-01-10"),
      updatedAt: new Date("2025-01-10"),
      name: "عبدالله أحمد الغامدي",
      nationalId: "1098765432",
      gender: "male",
      dateOfBirth: "1980-03-15",
      maritalStatus: "married",
      phone: "0501234567",
      familyCount: 6,
      dependentsCount: 4,
      iban: "SA1234567890123456789012",
      bank: "الراجحي",
      residenceArea: "aldeira",
      buildingOwnership: "private",
      buildingType: "concrete",
      buildingCondition: "good",
      buildingCapacity: "sufficient",
      husbandReligious: {
        hajj: { done: true, visitDate: "2019-08-10" },
        umrah: { done: true, visitDate: "2023-03-20" },
        prophetMosque: { done: true, visitDate: "2023-03-22" },
      },
      wifeReligious: {
        hajj: { done: false },
        umrah: { done: true, visitDate: "2023-03-20" },
        prophetMosque: { done: true, visitDate: "2023-03-22" },
      },
      furnitureAppliances: buildFurniture({
        windowAC: { good: 2, needsRepair: 1 },
        splitAC: { good: 1 },
        washingMachines: { good: 1 },
        refrigerators: { good: 1 },
        fans: { good: 3 },
        freezers: { unavailable: 1 },
        ovens: { good: 1 },
        heaters: { good: 1 },
        computers: { good: 1 },
        phones: { good: 2 },
        tvScreens: { good: 2 },
        mattresses: { good: 4, needsRepair: 1 },
        wardrobes: { good: 3 },
        blankets: { good: 6 },
        cars: { good: 1, notes: "كامري 2018" },
      }),
      incomeSources: buildIncome({
        modernSocialSecurity: { monthly: 1500 },
        citizenAccount: { monthly: 900 },
        freelance: { monthly: 1100, notes: "أعمال صيانة" },
      }),
      financialObligations: buildObligations({ rent: { monthly: 2000 } }),
      healthStatus: "بصحة جيدة",
      familySkillsTalents: "الأب يعمل في الصيانة العامة",
      // nextUpdate already passed → shows in "need update" filter
      updateDone: "2025-01-10",
      nextUpdate: daysFromNow(-60),
      categoryId: catIds[0],
      status: "approved",
      createdById: admin,
    },
    {
      beneficiaryNumber: "BNIF-000002",
      createdAt: new Date("2025-03-05"),
      updatedAt: new Date("2025-03-05"),
      name: "فاطمة محمد العتيبي",
      nationalId: "1098765433",
      gender: "female",
      dateOfBirth: "1987-07-22",
      maritalStatus: "widowed",
      phone: "0559876543",
      familyCount: 4,
      dependentsCount: 3,
      iban: "SA9876543210987654321098",
      bank: "الأهلي",
      residenceArea: "aladwa",
      buildingOwnership: "charity_house",
      buildingType: "arabic",
      buildingCondition: "average",
      buildingCapacity: "medium",
      incomeSources: buildIncome({ modernSocialSecurity: { monthly: 2000 } }),
      financialObligations: buildObligations({ rent: { monthly: 1500 } }),
      // nextUpdate in 10 days → shows in "need update" filter
      updateDone: "2025-09-01",
      nextUpdate: daysFromNow(10),
      categoryId: catIds[1],
      status: "approved",
      createdById: admin,
    },
    {
      beneficiaryNumber: "BNIF-000003",
      createdAt: new Date("2025-05-18"),
      updatedAt: new Date("2025-05-18"),
      name: "صالح عمر الدوسري",
      nationalId: "1098765434",
      gender: "male",
      dateOfBirth: "1970-11-05",
      maritalStatus: "married",
      phone: "0541112233",
      familyCount: 8,
      dependentsCount: 6,
      bank: "البلاد",
      residenceArea: "alrashidia",
      buildingOwnership: "developmental_housing",
      buildingType: "arabic",
      buildingCondition: "needs_repair",
      buildingCapacity: "small",
      healthStatus: "يعاني من السكري",
      incomeSources: buildIncome({
        modernSocialSecurity: { monthly: 2500 },
        citizenAccount: { monthly: 1000 },
        disabilityAid: { monthly: 500 },
      }),
      financialObligations: buildObligations({ rent: { monthly: 2500 } }),
      // nextUpdate 25 days away → shows in "need update" filter
      updateDone: "2025-10-01",
      nextUpdate: daysFromNow(25),
      categoryId: catIds[0],
      status: "approved",
      createdById: researcher,
    },
    {
      beneficiaryNumber: "BNIF-000004",
      createdAt: new Date("2025-07-22"),
      updatedAt: new Date("2025-07-22"),
      name: "نورة سعد القحطاني",
      nationalId: "1098765435",
      gender: "female",
      dateOfBirth: "1995-04-18",
      maritalStatus: "divorced",
      phone: "0567778899",
      familyCount: 3,
      dependentsCount: 2,
      bank: "الإنماء",
      residenceArea: "aliskan",
      buildingOwnership: "rented",
      buildingType: "concrete",
      buildingCondition: "good",
      buildingCapacity: "medium",
      incomeSources: buildIncome({
        modernSocialSecurity: { monthly: 1800 },
        citizenAccount: { monthly: 900 },
      }),
      financialObligations: buildObligations({ rent: { monthly: 1800 } }),
      // nextUpdate far away → does NOT show in "need update" filter
      updateDone: "2026-01-15",
      nextUpdate: daysFromNow(120),
      categoryId: catIds[2],
      status: "approved",
      createdById: researcher,
    },
    {
      beneficiaryNumber: "BNIF-000005",
      createdAt: new Date("2025-09-10"),
      updatedAt: new Date("2025-09-10"),
      name: "حسن علي الشهري",
      nationalId: "1098765436",
      gender: "male",
      dateOfBirth: "1963-09-10",
      maritalStatus: "married",
      phone: "0533445566",
      familyCount: 5,
      dependentsCount: 3,
      bank: "الراجحي",
      residenceArea: "aldahia",
      buildingOwnership: "shared",
      buildingType: "arabic",
      buildingCondition: "average",
      buildingCapacity: "medium",
      husbandReligious: {
        hajj: { done: true, visitDate: "2015-09-20" },
        umrah: { done: true, visitDate: "2022-04-10" },
        prophetMosque: { done: false },
      },
      incomeSources: buildIncome({
        modernSocialSecurity: { monthly: 1200 },
        citizenAccount: { monthly: 800 },
        pension: { monthly: 500 },
      }),
      financialObligations: buildObligations({ rent: { monthly: 1200 } }),
      // nextUpdate passed 15 days ago → shows in "need update" filter
      updateDone: "2025-06-01",
      nextUpdate: daysFromNow(-15),
      categoryId: catIds[3],
      status: "approved",
      createdById: admin,
    },
    {
      beneficiaryNumber: "BNIF-000006",
      createdAt: new Date("2025-11-01"),
      updatedAt: new Date("2025-11-01"),
      name: "مريم خالد الزهراني",
      nationalId: "1098765437",
      gender: "female",
      dateOfBirth: "1983-01-28",
      maritalStatus: "married",
      phone: "0577889900",
      familyCount: 7,
      dependentsCount: 5,
      bank: "الأهلي",
      residenceArea: "alsaadoon",
      buildingOwnership: "rented",
      buildingType: "concrete",
      buildingCondition: "good",
      buildingCapacity: "sufficient",
      incomeSources: buildIncome({ salary: { monthly: 3000 } }),
      financialObligations: buildObligations({ rent: { monthly: 2200 } }),
      // nextUpdate exactly today → shows in "need update" filter
      updateDone: "2025-11-01",
      nextUpdate: daysFromNow(0),
      categoryId: catIds[4],
      status: "approved",
      createdById: usersMgr,
    },
    {
      beneficiaryNumber: "BNIF-000007",
      createdAt: new Date("2026-01-08"),
      updatedAt: new Date("2026-01-08"),
      name: "يوسف إبراهيم المالكي",
      nationalId: "1098765438",
      gender: "male",
      dateOfBirth: "1997-12-03",
      maritalStatus: "single",
      phone: "0544556677",
      familyCount: 1,
      dependentsCount: 0,
      bank: "الراجحي",
      residenceArea: "aldana",
      buildingOwnership: "charity_house",
      buildingType: "concrete",
      buildingCondition: "average",
      buildingCapacity: "small",
      notes: "يتيم - بحاجة لدعم عاجل",
      // no nextUpdate → does NOT show in filter
      categoryId: catIds[5],
      status: "approved",
      createdById: usersMgr,
    },
    {
      beneficiaryNumber: "BNIF-000008",
      createdAt: new Date("2026-02-14"),
      updatedAt: new Date("2026-02-14"),
      name: "عائشة فهد السبيعي",
      nationalId: "1098765439",
      gender: "female",
      dateOfBirth: "1975-06-14",
      maritalStatus: "widowed",
      phone: "0511223344",
      familyCount: 3,
      dependentsCount: 2,
      bank: "البلاد",
      residenceArea: "alabadia",
      buildingOwnership: "developmental_housing",
      buildingType: "arabic",
      buildingCondition: "needs_repair",
      buildingCapacity: "small",
      incomeSources: buildIncome({ modernSocialSecurity: { monthly: 2200 } }),
      financialObligations: buildObligations({ rent: { monthly: 1600 } }),
      // nextUpdate 29 days from now → shows in "need update" filter
      updateDone: "2025-12-01",
      nextUpdate: daysFromNow(29),
      categoryId: catIds[1],
      status: "approved",
      createdById: admin,
    },
    // Beneficiary #9: TEST CASE — covers all 4 disbursement scenarios
    // P1 (دعم شهري, cats أ,ب) → already received (case 1)
    // P2 (كسوة الشتاء, cats أ,ت,ج) → family dedup (case 3)
    // P3 (سلة غذائية, cats ب,د) → not qualified (case 2) — cat أ not in [ب,د]
    // P4 (إعانة إيجار, cats أ,ت,و) → valid, can receive (case 4)
    {
      beneficiaryNumber: "BNIF-000009",
      createdAt: new Date("2026-03-15"),
      updatedAt: new Date("2026-03-15"),
      name: "محمد عبدالرحمن الحربي",
      nationalId: "1098765440",
      gender: "male",
      dateOfBirth: "1988-02-25",
      maritalStatus: "married",
      phone: "0512345678",
      familyCount: 4,
      dependentsCount: 2,
      iban: "SA5555555555555555555555",
      bank: "الراجحي",
      residenceArea: "alrashidia",
      buildingOwnership: "rented",
      buildingType: "concrete",
      buildingCondition: "average",
      buildingCapacity: "medium",
      husbandReligious: {
        hajj: { done: false },
        umrah: { done: true, visitDate: "2024-01-10" },
        prophetMosque: { done: false },
      },
      wifeReligious: {
        hajj: { done: false },
        umrah: { done: false },
        prophetMosque: { done: false },
      },
      furnitureAppliances: buildFurniture({
        windowAC: { good: 1, needsRepair: 1 },
        splitAC: { unavailable: 1 },
        washingMachines: { good: 1 },
        refrigerators: { good: 1 },
        fans: { good: 2 },
        freezers: { unavailable: 1 },
        ovens: { good: 1 },
        heaters: { needsRepair: 1 },
        spaceHeaters: { good: 1 },
        computers: { unavailable: 1 },
        phones: { good: 2 },
        tvScreens: { good: 1 },
        mattresses: { good: 3, needsReplacement: 1 },
        wardrobes: { good: 2 },
        blankets: { good: 4 },
        cars: { notes: "لا يملك سيارة" },
      }),
      incomeSources: buildIncome({
        socialInsurance: { monthly: 1500 },
        citizenAccount: { monthly: 700 },
        freelance: { monthly: 500, notes: "بيع بسيط" },
      }),
      financialObligations: buildObligations({
        rent: { monthly: 1800 },
        loanPayment: { monthly: 500, notes: "قرض شخصي" },
      }),
      researcherNotes: "مستفيد اختباري — يغطي جميع حالات الصرف الأربع",
      // nextUpdate 5 days from now → shows in "need update" filter
      updateDone: "2026-01-15",
      nextUpdate: daysFromNow(5),
      categoryId: catIds[0],
      status: "approved",
      createdById: admin,
    },
  ];
};

// ── Dependents for core beneficiaries (indices reference createdBeneficiaries) ──

const buildCoreDependents = (benIds) => [
  // Beneficiary 1
  { beneficiaryId: benIds[0], name: "سعد عبدالله الغامدي", nationalId: "1198765001", gender: "male", dateOfBirth: "2007-05-12", relationship: "son", educationStatus: "enrolled", schoolName: "ثانوية الملك فهد", schoolGrade: "ثالث ثانوي", schoolType: "public", academicGrade: "جيد جداً", religious: { hajj: { done: false }, umrah: { done: true, lastYear: "1445" }, prophetMosque: { done: true, lastYear: "1445" } } },
  { beneficiaryId: benIds[0], name: "ريم عبدالله الغامدي", nationalId: "1198765002", gender: "female", dateOfBirth: "2011-08-03", relationship: "daughter", educationStatus: "enrolled", schoolName: "متوسطة النور", schoolGrade: "ثاني متوسط", schoolType: "public", academicGrade: "ممتاز", weaknessSubjects: "الرياضيات" },
  { beneficiaryId: benIds[0], name: "خالد عبدالله الغامدي", nationalId: "1198765003", gender: "male", dateOfBirth: "2015-01-20", relationship: "son", educationStatus: "enrolled", schoolName: "ابتدائية الأمل", schoolGrade: "رابع ابتدائي", schoolType: "public", academicGrade: "جيد" },
  // Beneficiary 2
  { beneficiaryId: benIds[1], name: "أحمد فاطمة العتيبي", nationalId: "1198765004", gender: "male", dateOfBirth: "2009-03-10", relationship: "son", educationStatus: "enrolled" },
  { beneficiaryId: benIds[1], name: "سارة فاطمة العتيبي", nationalId: "1198765005", gender: "female", dateOfBirth: "2013-06-15", relationship: "daughter", educationStatus: "enrolled", dependentMaritalStatus: "عزباء" },
  // Beneficiary 3
  { beneficiaryId: benIds[2], name: "عمر صالح الدوسري", nationalId: "1198765006", gender: "male", dateOfBirth: "2003-10-08", relationship: "son", educationStatus: "graduated", dependentMaritalStatus: "أعزب", religious: { hajj: { done: true, lastYear: "1444" }, umrah: { done: true, lastYear: "1445" }, prophetMosque: { done: false } } },
  { beneficiaryId: benIds[2], name: "هند صالح الدوسري", nationalId: "1198765007", gender: "female", dateOfBirth: "2005-04-22", relationship: "daughter", educationStatus: "enrolled", healthStatus: "حالة مستقرة" },
  { beneficiaryId: benIds[2], name: "ماجد صالح الدوسري", nationalId: "1198765008", gender: "male", dateOfBirth: "2010-12-01", relationship: "son", educationStatus: "enrolled", weaknessSubjects: "اللغة الإنجليزية" },
  // Beneficiary 4
  { beneficiaryId: benIds[3], name: "لمى نورة القحطاني", nationalId: "1198765009", gender: "female", dateOfBirth: "2017-07-30", relationship: "daughter", educationStatus: "enrolled", schoolType: "public" },
  { beneficiaryId: benIds[3], name: "تركي نورة القحطاني", nationalId: "1198765010", gender: "male", dateOfBirth: "2020-11-15", relationship: "son", educationStatus: "not_enrolled" },
  // Beneficiary 6
  { beneficiaryId: benIds[5], name: "ياسر مريم الزهراني", nationalId: "1198765011", gender: "male", dateOfBirth: "2006-02-14", relationship: "son", educationStatus: "enrolled" },
  { beneficiaryId: benIds[5], name: "أمل مريم الزهراني", nationalId: "1198765012", gender: "female", dateOfBirth: "2009-09-25", relationship: "daughter", educationStatus: "enrolled" },
  { beneficiaryId: benIds[5], name: "فيصل مريم الزهراني", nationalId: "1198765013", gender: "male", dateOfBirth: "2014-05-07", relationship: "son", educationStatus: "enrolled" },
  // Beneficiary 9 — dependent matching beneficiary 3 → triggers family dedup
  { beneficiaryId: benIds[8], name: "صالح عمر الدوسري", nationalId: "1098765434", gender: "male", dateOfBirth: "1970-11-05", relationship: "other", relationshipOther: "قريب", dependentMaritalStatus: "متزوج", religious: { hajj: { done: true, lastYear: "1443" }, umrah: { done: true, lastYear: "1445" }, prophetMosque: { done: true, lastYear: "1444" } } },
  { beneficiaryId: benIds[8], name: "نوف محمد الحربي", nationalId: "1198765014", gender: "female", dateOfBirth: "2012-08-18", relationship: "daughter", educationStatus: "enrolled", schoolType: "public", schoolName: "ابتدائية الأندلس", schoolGrade: "سادس ابتدائي" },
];

// ── Core disbursements ──

const buildCoreDisbursements = (benIds, progIds, userIds) => {
  const [admin, , , distributor] = userIds;
  return [
    { beneficiaryId: benIds[0], programId: progIds[0], disbursedById: admin, disbursedAt: "2025-02-01", createdAt: new Date("2025-02-01"), updatedAt: new Date("2025-02-01"), notes: "صرف شهر فبراير" },
    { beneficiaryId: benIds[0], programId: progIds[0], disbursedById: distributor, disbursedAt: "2025-03-01", createdAt: new Date("2025-03-01"), updatedAt: new Date("2025-03-01"), notes: "صرف شهر مارس" },
    { beneficiaryId: benIds[1], programId: progIds[0], disbursedById: distributor, disbursedAt: "2025-04-01", createdAt: new Date("2025-04-01"), updatedAt: new Date("2025-04-01") },
    { beneficiaryId: benIds[1], programId: progIds[2], disbursedById: admin, disbursedAt: "2026-03-05", createdAt: new Date("2026-03-05"), updatedAt: new Date("2026-03-05"), notes: "سلة رمضان" },
    { beneficiaryId: benIds[2], programId: progIds[1], disbursedById: distributor, disbursedAt: "2025-11-01", createdAt: new Date("2025-11-01"), updatedAt: new Date("2025-11-01"), notes: "كسوة شتاء" },
    { beneficiaryId: benIds[3], programId: progIds[3], disbursedById: admin, disbursedAt: "2025-09-01", createdAt: new Date("2025-09-01"), updatedAt: new Date("2025-09-01"), notes: "إعانة إيجار الربع الثالث" },
    { beneficiaryId: benIds[4], programId: progIds[0], disbursedById: distributor, disbursedAt: "2025-10-15", createdAt: new Date("2025-10-15"), updatedAt: new Date("2025-10-15") },
    { beneficiaryId: benIds[5], programId: progIds[1], disbursedById: distributor, disbursedAt: "2025-12-01", createdAt: new Date("2025-12-01"), updatedAt: new Date("2025-12-01"), notes: "كسوة شتاء" },
    { beneficiaryId: benIds[6], programId: progIds[0], disbursedById: admin, disbursedAt: "2026-02-01", createdAt: new Date("2026-02-01"), updatedAt: new Date("2026-02-01") },
    { beneficiaryId: benIds[7], programId: progIds[2], disbursedById: distributor, disbursedAt: "2026-03-10", createdAt: new Date("2026-03-10"), updatedAt: new Date("2026-03-10") },
    // Beneficiary 9 received from program 1 (test case 1)
    { beneficiaryId: benIds[8], programId: progIds[0], disbursedById: distributor, disbursedAt: "2026-03-18", createdAt: new Date("2026-03-18"), updatedAt: new Date("2026-03-18"), notes: "صرف دعم شهري — مستفيد اختباري" },
  ];
};

module.exports = {
  categoriesData,
  programsData,
  buildCoreBeneficiaries,
  buildCoreDependents,
  buildCoreDisbursements,
  daysFromNow,
};
