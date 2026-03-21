const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");
const { REPORTS_PATH, cleanOldFiles } = require("../config/storage");
const {
  Beneficiary,
  Dependent,
  User,
  Category,
  Program,
  Disbursement,
  sequelize,
} = require("../models");
const { ValidationError } = require("../utils/errors");
const { createExcelBuffer } = require("../utils/excelHelper");

const REPORTS_DIR = REPORTS_PATH;

// Furniture/Income/Obligation Arabic labels for Excel columns
const FURNITURE_KEYS = {
  windowAC: "مكيفات نافذة",
  splitAC: "مكيفات سبليت",
  washingMachines: "غسالات",
  refrigerators: "ثلاجات",
  fans: "مراوح",
  freezers: "فريزرات",
  ovens: "أفران",
  heaters: "سخانات",
  spaceHeaters: "دفايات",
  computers: "كمبيوترات",
  phones: "جوالات",
  tvScreens: "تلفزيونات / شاشات",
  mattresses: "مراتب / فرش",
  wardrobes: "دولاب",
  blankets: "بطانيات",
  cars: "سيارات",
};
const FURNITURE_STATUS = {
  good: "جيد",
  unavailable: "غير متوفر",
  needsRepair: "يحتاج إصلاح",
  needsReplacement: "يحتاج استبدال",
};

const INCOME_KEYS = {
  salary: "الراتب",
  socialInsurance: "التأمينات الاجتماعية",
  modernSocialSecurity: "الضمان الاجتماعي المطور",
  citizenAccount: "حساب المواطن",
  pension: "راتب تقاعدي",
  disabilityAid: "مساعدة معوقين",
  alimony: "النفقة",
  freelance: "عمل حر",
  other: "أخرى (دخل)",
};

const OBLIGATION_KEYS = {
  rent: "إيجار سكن",
  loanPayment: "تسديد قرض",
  carInstallment: "أقساط سيارة",
  domesticWorker: "عاملة منزلية",
  other: "أخرى (التزامات)",
};

// ── Enum labels for CSV Arabic columns ──

const ENUM_LABELS = {
  gender: { male: "ذكر", female: "أنثى" },
  maritalStatus: {
    married: "متزوج/ة",
    single: "أعزب/عزباء",
    divorced: "مطلقة",
    widowed: "أرملة",
    abandoned: "مهجورة",
  },
  residenceArea: {
    aldeira: "الديرة",
    aladwa: "العدوة",
    alrashidia: "الراشدية",
    alabadia: "العبادية",
    alsaadoon: "السعدون",
    aliskan: "الإسكان",
    aldahia: "الضاحية",
    aldana: "الدانة",
    other: "أخرى",
  },
  buildingOwnership: { private: "ملك خاص", shared: "مشترك", rented: "مستأجر" },
  buildingType: { arabic: "عربي", concrete: "مسلح", other: "أخرى" },
  buildingCondition: {
    good: "جيدة",
    average: "متوسطة",
    needs_repair: "بحاجة لإصلاح",
  },
  buildingCapacity: { small: "صغير", medium: "متوسط", sufficient: "يكفي" },
};

const enumLabel = (field, val) => ENUM_LABELS[field]?.[val] || val || "";

// ── Filter field definitions (sent to UI to build the filter form) ──

const FILTER_FIELDS = [
  // Basic
  { key: "categoryId", label: "الفئة", type: "category", group: "أساسي" },
  { key: "programId", label: "البرامج المستلمة", type: "program", group: "أساسي" },
  { key: "name", label: "الإسم", type: "text", group: "أساسي" },
  { key: "nationalId", label: "رقم الهوية", type: "text", group: "أساسي" },
  {
    key: "gender",
    label: "النوع",
    type: "enum",
    group: "أساسي",
    options: [
      { value: "male", label: "ذكر" },
      { value: "female", label: "أنثى" },
    ],
  },
  { key: "dateOfBirth", label: "تاريخ الميلاد", type: "date", group: "أساسي" },
  {
    key: "maritalStatus",
    label: "الحالة الاجتماعية",
    type: "enum",
    group: "أساسي",
    options: [
      { value: "married", label: "متزوج/ة" },
      { value: "single", label: "أعزب/عزباء" },
      { value: "divorced", label: "مطلقة" },
      { value: "widowed", label: "أرملة" },
      { value: "abandoned", label: "مهجورة" },
    ],
  },
  { key: "phone", label: "رقم الجوال", type: "text", group: "أساسي" },
  { key: "familyCount", label: "عدد الأسرة", type: "number", group: "أساسي" },
  {
    key: "dependentsCount",
    label: "عدد التابعين",
    type: "number",
    group: "أساسي",
  },
  // Housing
  {
    key: "residenceArea",
    label: "جهة السكن",
    type: "enum",
    group: "السكن",
    options: [
      { value: "aldeira", label: "الديرة" },
      { value: "aladwa", label: "العدوة" },
      { value: "alrashidia", label: "الراشدية" },
      { value: "alabadia", label: "العبادية" },
      { value: "alsaadoon", label: "السعدون" },
      { value: "aliskan", label: "الإسكان" },
      { value: "aldahia", label: "الضاحية" },
      { value: "aldana", label: "الدانة" },
      { value: "other", label: "أخرى" },
    ],
  },
  {
    key: "buildingOwnership",
    label: "ملكية البناء",
    type: "enum",
    group: "السكن",
    options: [
      { value: "private", label: "ملك خاص" },
      { value: "shared", label: "مشترك" },
      { value: "rented", label: "مستأجر" },
    ],
  },
  {
    key: "buildingType",
    label: "نوع البناء",
    type: "enum",
    group: "السكن",
    options: [
      { value: "arabic", label: "عربي" },
      { value: "concrete", label: "مسلح" },
      { value: "other", label: "أخرى" },
    ],
  },
  {
    key: "buildingCondition",
    label: "حالة البناء",
    type: "enum",
    group: "السكن",
    options: [
      { value: "good", label: "جيدة" },
      { value: "average", label: "متوسطة" },
      { value: "needs_repair", label: "بحاجة لإصلاح" },
    ],
  },
  {
    key: "buildingCapacity",
    label: "اتساع البناء",
    type: "enum",
    group: "السكن",
    options: [
      { value: "small", label: "صغير" },
      { value: "medium", label: "متوسط" },
      { value: "sufficient", label: "يكفي" },
    ],
  },
  // Religious (JSON)
  {
    key: "husbandReligious.hajj.done",
    label: "حج الزوج",
    type: "boolean",
    group: "الزيارات الدينية",
  },
  {
    key: "husbandReligious.umrah.done",
    label: "عمرة الزوج",
    type: "boolean",
    group: "الزيارات الدينية",
  },
  {
    key: "husbandReligious.prophetMosque.done",
    label: "المسجد النبوي (الزوج)",
    type: "boolean",
    group: "الزيارات الدينية",
  },
  {
    key: "wifeReligious.hajj.done",
    label: "حج الزوجة",
    type: "boolean",
    group: "الزيارات الدينية",
  },
  {
    key: "wifeReligious.umrah.done",
    label: "عمرة الزوجة",
    type: "boolean",
    group: "الزيارات الدينية",
  },
  {
    key: "wifeReligious.prophetMosque.done",
    label: "المسجد النبوي (الزوجة)",
    type: "boolean",
    group: "الزيارات الدينية",
  },
  // Dependent
  {
    key: "dependent.relationship",
    label: "صلة قرابة التابع",
    type: "enum",
    group: "التابعين",
    options: [
      { value: "son", label: "ابن" },
      { value: "daughter", label: "ابنة" },
      { value: "other", label: "أخرى" },
    ],
  },
  {
    key: "dependent.gender",
    label: "نوع التابع",
    type: "enum",
    group: "التابعين",
    options: [
      { value: "male", label: "ذكر" },
      { value: "female", label: "أنثى" },
    ],
  },
  {
    key: "dependent.schoolType",
    label: "نوع مدرسة التابع",
    type: "enum",
    group: "التابعين",
    options: [
      { value: "public", label: "حكومية" },
      { value: "private", label: "أهلية" },
      { value: "other", label: "أخرى" },
    ],
  },
  {
    key: "dependent.educationStatus",
    label: "حالة تعليم التابع",
    type: "enum",
    group: "التابعين",
    options: [
      { value: "enrolled", label: "مسجل" },
      { value: "graduated", label: "متخرج" },
      { value: "dropped_out", label: "منقطع" },
      { value: "not_enrolled", label: "غير مسجل" },
    ],
  },
];

// Whitelists for security
const VALID_FILTER_KEYS = new Set(FILTER_FIELDS.map((f) => f.key));
const VALID_OPS = new Set(["eq", "ne", "gt", "gte", "lt", "lte", "like", "in"]);

const TYPE_OPERATORS = {
  text: ["like", "eq"],
  number: ["eq", "gte", "lte", "gt", "lt"],
  date: ["eq", "gte", "lte"],
  enum: ["eq", "in"],
  boolean: ["eq"],
  category: ["eq", "in"],
  program: ["eq", "in"],
};

// Direct DB columns that can be filtered
const DIRECT_COLUMNS = new Set([
  "categoryId",
  "name",
  "nationalId",
  "gender",
  "dateOfBirth",
  "maritalStatus",
  "phone",
  "familyCount",
  "dependentsCount",
  "residenceArea",
  "buildingOwnership",
  "buildingType",
  "buildingCondition",
  "buildingCapacity",
  "healthStatus",
]);

// Valid dependent columns
const DEPENDENT_COLUMNS = new Set([
  "relationship",
  "gender",
  "schoolType",
  "educationStatus",
]);

// ── Filter builder ──

const buildOpValue = (op, val) => {
  switch (op) {
    case "ne":
      return { [Op.ne]: val };
    case "gt":
      return { [Op.gt]: val };
    case "gte":
      return { [Op.gte]: val };
    case "lt":
      return { [Op.lt]: val };
    case "lte":
      return { [Op.lte]: val };
    case "like":
      return { [Op.like]: `%${val}%` };
    case "in":
      return { [Op.in]: Array.isArray(val) ? val : [val] };
    default:
      return val;
  }
};

const buildWhereClause = (filters) => {
  const beneficiaryWhere = {};
  const dependentWhere = {};
  let hasDependentFilter = false;
  let programFilter = null;

  for (const f of filters) {
    if (!VALID_FILTER_KEYS.has(f.field)) continue;
    const op = VALID_OPS.has(f.op) ? f.op : "eq";

    if (f.field === "programId") {
      programFilter = { op, value: f.value };
    } else if (f.field.startsWith("dependent.")) {
      const col = f.field.replace("dependent.", "");
      if (!DEPENDENT_COLUMNS.has(col)) continue;
      hasDependentFilter = true;
      dependentWhere[col] = buildOpValue(op, f.value);
    } else if (f.field.includes(".")) {
      // JSON boolean field — path is from whitelist so safe for literal
      const parts = f.field.split(".");
      const column = parts[0];
      const jsonPath = "$." + parts.slice(1).join(".");
      const boolStr =
        f.value === true || f.value === "true" ? "true" : "false";
      if (!beneficiaryWhere[Op.and]) beneficiaryWhere[Op.and] = [];
      beneficiaryWhere[Op.and].push(
        sequelize.literal(
          `JSON_UNQUOTE(JSON_EXTRACT(\`${column}\`, '${jsonPath}')) = '${boolStr}'`
        )
      );
    } else if (DIRECT_COLUMNS.has(f.field)) {
      beneficiaryWhere[f.field] = buildOpValue(op, f.value);
    }
  }

  return { beneficiaryWhere, dependentWhere, hasDependentFilter, programFilter };
};

// ── 1. Filter fields metadata ──

const getFilterFields = async (req, res, next) => {
  try {
    const [categories, programs] = await Promise.all([
      Category.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] }),
      Program.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] }),
    ]);

    const fields = FILTER_FIELDS.map((f) => ({
      ...f,
      operators: TYPE_OPERATORS[f.type] || ["eq"],
      ...(f.key === "categoryId" && {
        options: categories.map((c) => ({ value: c.id, label: c.name })),
      }),
      ...(f.key === "programId" && {
        options: programs.map((p) => ({ value: p.id, label: p.name })),
      }),
    }));

    res.json({ success: true, fields });
  } catch (error) {
    next(error);
  }
};

// ── 2. Beneficiary filter (paginated JSON — used by beneficiary page) ──

const filterBeneficiaries = async (req, res, next) => {
  try {
    const { filters = [], search, page = 1, limit = 20 } = req.body;
    const offset = (page - 1) * limit;

    const { beneficiaryWhere, dependentWhere, hasDependentFilter, programFilter } =
      buildWhereClause(filters);

    // Optional text search (same as getBeneficiaries)
    if (search) {
      if (!beneficiaryWhere[Op.and]) beneficiaryWhere[Op.and] = [];
      beneficiaryWhere[Op.and].push({
        [Op.or]: [
          { beneficiaryNumber: { [Op.like]: `%${search}%` } },
          { nationalId: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      });
    }

    // Program filter → find beneficiaries who received certain programs
    if (programFilter) {
      const progWhere = {};
      progWhere.programId = buildOpValue(programFilter.op, programFilter.value);
      const matchingDisb = await Disbursement.findAll({
        where: progWhere,
        attributes: ["beneficiaryId"],
        group: ["beneficiaryId"],
        raw: true,
      });
      const ids = matchingDisb.map((d) => d.beneficiaryId);
      if (ids.length === 0) {
        return res.json({
          success: true,
          beneficiaries: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0,
          },
        });
      }
      if (beneficiaryWhere.id) {
        // Combine with existing id filter (e.g. from dependent filter)
        const existingIds = beneficiaryWhere.id[Op.in] || [];
        beneficiaryWhere.id = { [Op.in]: ids.filter((id) => existingIds.length === 0 || existingIds.includes(id)) };
      } else {
        beneficiaryWhere.id = { [Op.in]: ids };
      }
    }

    // Dependent filter → find matching beneficiary IDs
    if (hasDependentFilter) {
      const matchingDeps = await Dependent.findAll({
        where: dependentWhere,
        attributes: ["beneficiaryId"],
        group: ["beneficiaryId"],
        raw: true,
      });
      const ids = matchingDeps.map((d) => d.beneficiaryId);
      if (ids.length === 0) {
        return res.json({
          success: true,
          beneficiaries: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0,
          },
        });
      }
      beneficiaryWhere.id = { [Op.in]: ids };
    }

    const { count, rows } = await Beneficiary.findAndCountAll({
      where: beneficiaryWhere,
      include: [
        { model: User, as: "createdBy", attributes: ["id", "name"] },
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "color"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      beneficiaries: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── 3. Beneficiaries Excel report (2 sheets: beneficiaries + dependents) ──

const exportBeneficiariesReport = async (req, res, next) => {
  try {
    cleanOldFiles(REPORTS_DIR, 24);
    const { filters = [] } = req.body;
    const { beneficiaryWhere, dependentWhere, hasDependentFilter, programFilter } =
      buildWhereClause(filters);

    // Program filter → find beneficiaries who received certain programs
    if (programFilter) {
      const progWhere = {};
      progWhere.programId = buildOpValue(programFilter.op, programFilter.value);
      const matchingDisb = await Disbursement.findAll({
        where: progWhere,
        attributes: ["beneficiaryId"],
        group: ["beneficiaryId"],
        raw: true,
      });
      const ids = matchingDisb.map((d) => d.beneficiaryId);
      if (ids.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "لا توجد نتائج" });
      }
      beneficiaryWhere.id = { [Op.in]: ids };
    }

    if (hasDependentFilter) {
      const matchingDeps = await Dependent.findAll({
        where: dependentWhere,
        attributes: ["beneficiaryId"],
        group: ["beneficiaryId"],
        raw: true,
      });
      const ids = matchingDeps.map((d) => d.beneficiaryId);
      if (ids.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "لا توجد نتائج" });
      }
      beneficiaryWhere.id = { [Op.in]: ids };
    }

    const beneficiaries = await Beneficiary.findAll({
      where: beneficiaryWhere,
      include: [
        { model: Category, as: "category", attributes: ["name"] },
        { model: Dependent, as: "dependents" },
        {
          model: Disbursement,
          as: "disbursements",
          include: [{ model: Program, as: "program", attributes: ["name"] }],
        },
        { model: User, as: "createdBy", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (beneficiaries.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "لا توجد نتائج" });
    }

    // ── Sheet 1: Beneficiaries ──
    const benColumns = [
      { header: "رقم المستفيد", key: "beneficiaryNumber", width: 16 },
      { header: "الإسم", key: "name", width: 25 },
      { header: "رقم الهوية", key: "nationalId", width: 14 },
      { header: "النوع", key: "gender", width: 10 },
      { header: "تاريخ الميلاد", key: "dateOfBirth", width: 14 },
      { header: "الحالة الاجتماعية", key: "maritalStatus", width: 14 },
      { header: "الفئة", key: "category", width: 12 },
      { header: "الجوال", key: "phone", width: 14 },
      { header: "جوال آخر", key: "otherPhone", width: 14 },
      { header: "عدد الأسرة", key: "familyCount", width: 10 },
      { header: "عدد التابعين", key: "dependentsCount", width: 10 },
      { header: "الآيبان", key: "iban", width: 28 },
      { header: "البنك", key: "bank", width: 14 },
      { header: "جهة السكن", key: "residenceArea", width: 14 },
      { header: "ملكية البناء", key: "buildingOwnership", width: 12 },
      { header: "نوع البناء", key: "buildingType", width: 12 },
      { header: "حالة البناء", key: "buildingCondition", width: 14 },
      { header: "اتساع البناء", key: "buildingCapacity", width: 12 },
      // Religious
      { header: "حج الزوج", key: "husbandHajj", width: 10 },
      { header: "عمرة الزوج", key: "husbandUmrah", width: 10 },
      { header: "المسجد النبوي (الزوج)", key: "husbandMosque", width: 16 },
      { header: "حج الزوجة", key: "wifeHajj", width: 10 },
      { header: "عمرة الزوجة", key: "wifeUmrah", width: 10 },
      { header: "المسجد النبوي (الزوجة)", key: "wifeMosque", width: 16 },
    ];

    // Furniture columns (status + notes for each item)
    for (const [fKey, fLabel] of Object.entries(FURNITURE_KEYS)) {
      benColumns.push({ header: `${fLabel} — الحالة`, key: `f_${fKey}_status`, width: 16 });
      benColumns.push({ header: `${fLabel} — ملاحظات`, key: `f_${fKey}_notes`, width: 16 });
    }

    // Income columns (monthly + notes for each source)
    for (const [iKey, iLabel] of Object.entries(INCOME_KEYS)) {
      benColumns.push({ header: `${iLabel} — شهري`, key: `i_${iKey}_monthly`, width: 14 });
      benColumns.push({ header: `${iLabel} — ملاحظات`, key: `i_${iKey}_notes`, width: 14 });
    }
    benColumns.push({ header: "مجموع الدخل الشهري", key: "totalIncome", width: 16 });

    // Obligation columns (monthly + notes)
    for (const [oKey, oLabel] of Object.entries(OBLIGATION_KEYS)) {
      benColumns.push({ header: `${oLabel} — شهري`, key: `o_${oKey}_monthly`, width: 14 });
      benColumns.push({ header: `${oLabel} — ملاحظات`, key: `o_${oKey}_notes`, width: 14 });
    }
    benColumns.push({ header: "مجموع الالتزامات الشهرية", key: "totalObligations", width: 18 });
    benColumns.push({ header: "نصيب الفرد", key: "perCapita", width: 12 });

    // General fields
    benColumns.push(
      { header: "الحالة الصحية", key: "healthStatus", width: 20 },
      { header: "الأصل", key: "origin", width: 14 },
      { header: "الصفات", key: "attributes", width: 14 },
      { header: "الالتحاق", key: "enrollment", width: 14 },
      { header: "تاريخ الزيارة", key: "visitDate", width: 14 },
      { header: "تحديث تم", key: "updateDone", width: 14 },
      { header: "التحديث القادم", key: "nextUpdate", width: 14 },
      { header: "تاريخ خاص", key: "specialDate", width: 14 },
      { header: "المهن والمواهب", key: "familySkillsTalents", width: 22 },
      { header: "ملاحظات الباحث", key: "researcherNotes", width: 22 },
      { header: "ملاحظات", key: "notes", width: 22 },
      { header: "عدد التابعين الفعلي", key: "actualDependents", width: 14 },
      { header: "البرامج المستلمة", key: "programs", width: 22 },
      { header: "أنشئ بواسطة", key: "createdBy", width: 14 },
      { header: "تاريخ الإنشاء", key: "createdAt", width: 18 }
    );

    const benRows = beneficiaries.map((b) => {
      const hr = b.husbandReligious || {};
      const wr = b.wifeReligious || {};
      const fur = b.furnitureAppliances || {};
      const inc = b.incomeSources || {};
      const obl = b.financialObligations || {};

      const totalIncome = Object.values(inc).reduce((s, v) => s + (v?.monthly || 0), 0);
      const totalObl = Object.values(obl).reduce((s, v) => s + (v?.monthly || 0), 0);

      const row = {
        beneficiaryNumber: b.beneficiaryNumber,
        name: b.name || "",
        nationalId: b.nationalId,
        gender: enumLabel("gender", b.gender),
        dateOfBirth: b.dateOfBirth || "",
        maritalStatus: enumLabel("maritalStatus", b.maritalStatus),
        category: b.category?.name || "",
        phone: b.phone || "",
        otherPhone: b.otherPhone || "",
        familyCount: b.familyCount ?? "",
        dependentsCount: b.dependentsCount ?? "",
        iban: b.iban || "",
        bank: b.bank || "",
        residenceArea: enumLabel("residenceArea", b.residenceArea) + (b.residenceAreaOther ? ` (${b.residenceAreaOther})` : ""),
        buildingOwnership: enumLabel("buildingOwnership", b.buildingOwnership),
        buildingType: enumLabel("buildingType", b.buildingType) + (b.buildingTypeOther ? ` (${b.buildingTypeOther})` : ""),
        buildingCondition: enumLabel("buildingCondition", b.buildingCondition),
        buildingCapacity: enumLabel("buildingCapacity", b.buildingCapacity),
        husbandHajj: hr.hajj?.done ? "نعم" : "لا",
        husbandUmrah: hr.umrah?.done ? "نعم" : "لا",
        husbandMosque: hr.prophetMosque?.done ? "نعم" : "لا",
        wifeHajj: wr.hajj?.done ? "نعم" : "لا",
        wifeUmrah: wr.umrah?.done ? "نعم" : "لا",
        wifeMosque: wr.prophetMosque?.done ? "نعم" : "لا",
      };

      // Furniture
      for (const fKey of Object.keys(FURNITURE_KEYS)) {
        const item = fur[fKey] || {};
        const statuses = Object.entries(FURNITURE_STATUS)
          .filter(([k]) => item[k])
          .map(([, v]) => v);
        row[`f_${fKey}_status`] = statuses.join("، ") || "";
        row[`f_${fKey}_notes`] = item.notes || "";
      }

      // Income
      for (const iKey of Object.keys(INCOME_KEYS)) {
        const item = inc[iKey] || {};
        row[`i_${iKey}_monthly`] = item.monthly || "";
        row[`i_${iKey}_notes`] = item.notes || "";
      }
      row.totalIncome = totalIncome || "";

      // Obligations
      for (const oKey of Object.keys(OBLIGATION_KEYS)) {
        const item = obl[oKey] || {};
        row[`o_${oKey}_monthly`] = item.monthly || "";
        row[`o_${oKey}_notes`] = item.notes || "";
      }
      row.totalObligations = totalObl || "";
      row.perCapita = b.familyCount ? Math.round(totalIncome / b.familyCount) : "";

      row.healthStatus = b.healthStatus || "";
      row.origin = b.origin || "";
      row.attributes = b.attributes || "";
      row.enrollment = b.enrollment || "";
      row.visitDate = b.visitDate || "";
      row.updateDone = b.updateDone || "";
      row.nextUpdate = b.nextUpdate || "";
      row.specialDate = b.specialDate || "";
      row.familySkillsTalents = b.familySkillsTalents || "";
      row.researcherNotes = b.researcherNotes || "";
      row.notes = b.notes || "";
      row.actualDependents = b.dependents?.length || 0;
      row.programs = (b.disbursements || []).map((d) => d.program?.name).filter(Boolean).join("، ");
      row.createdBy = b.createdBy?.name || "";
      row.createdAt = new Date(b.createdAt).toLocaleString("ar-SA");

      return row;
    });

    // ── Sheet 2: Dependents ──
    const depColumns = [
      { header: "رقم المستفيد", key: "beneficiaryNumber", width: 16 },
      { header: "إسم المستفيد", key: "beneficiaryName", width: 25 },
      { header: "إسم التابع", key: "name", width: 25 },
      { header: "رقم هوية التابع", key: "nationalId", width: 14 },
      { header: "النوع", key: "gender", width: 10 },
      { header: "تاريخ الميلاد", key: "dateOfBirth", width: 14 },
      { header: "صلة القرابة", key: "relationship", width: 14 },
      { header: "الحالة الاجتماعية", key: "maritalStatus", width: 14 },
      { header: "اسم المدرسة", key: "schoolName", width: 20 },
      { header: "الصف الدراسي", key: "schoolGrade", width: 12 },
      { header: "نوع المدرسة", key: "schoolType", width: 12 },
      { header: "التقدير الدراسي", key: "academicGrade", width: 12 },
      { header: "مواد الضعف", key: "weaknessSubjects", width: 18 },
      { header: "الحالة التعليمية", key: "educationStatus", width: 14 },
      { header: "الحالة الصحية", key: "healthStatus", width: 20 },
      { header: "ملاحظات", key: "notes", width: 22 },
    ];

    const RELATIONSHIP_LABELS = { son: "ابن", daughter: "ابنة", other: "أخرى" };
    const SCHOOL_TYPE_LABELS = { public: "حكومية", private: "أهلية", other: "أخرى" };
    const EDU_STATUS_LABELS = { enrolled: "مسجل", graduated: "متخرج", dropped_out: "منقطع", not_enrolled: "غير مسجل" };

    const depRows = [];
    for (const b of beneficiaries) {
      for (const d of b.dependents || []) {
        depRows.push({
          beneficiaryNumber: b.beneficiaryNumber,
          beneficiaryName: b.name || "",
          name: d.name || "",
          nationalId: d.nationalId || "",
          gender: enumLabel("gender", d.gender),
          dateOfBirth: d.dateOfBirth || "",
          relationship: RELATIONSHIP_LABELS[d.relationship] || d.relationshipOther || d.relationship || "",
          maritalStatus: d.dependentMaritalStatus || "",
          schoolName: d.schoolName || "",
          schoolGrade: d.schoolGrade || "",
          schoolType: SCHOOL_TYPE_LABELS[d.schoolType] || d.schoolTypeOther || d.schoolType || "",
          academicGrade: d.academicGrade || "",
          weaknessSubjects: d.weaknessSubjects || "",
          educationStatus: EDU_STATUS_LABELS[d.educationStatus] || d.educationStatus || "",
          healthStatus: d.healthStatus || "",
          notes: d.notes || "",
        });
      }
    }

    const buffer = await createExcelBuffer([
      { name: "المستفيدين", columns: benColumns, rows: benRows },
      { name: "التابعين", columns: depColumns, rows: depRows },
    ]);

    const fileName = `تقرير_المستفيدين_${Date.now()}.xlsx`;
    const filePath = path.join(REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
};

// ── 4. Programs Excel report (2 sheets: summary + disbursements) ──

const exportProgramsReport = async (req, res, next) => {
  try {
    cleanOldFiles(REPORTS_DIR, 24);
    const { programIds } = req.body;

    if (!programIds || !Array.isArray(programIds) || programIds.length === 0) {
      throw new ValidationError("اختر برنامج واحد على الأقل");
    }

    const programs = await Program.findAll({
      where: { id: { [Op.in]: programIds.map(Number) } },
      include: [
        { model: Category, as: "categories", attributes: ["name"] },
        {
          model: Disbursement,
          as: "disbursements",
          include: [
            {
              model: Beneficiary,
              as: "beneficiary",
              attributes: ["beneficiaryNumber", "name", "nationalId"],
            },
            { model: User, as: "disbursedBy", attributes: ["name"] },
          ],
        },
      ],
    });

    if (programs.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "لا توجد برامج" });
    }

    // Sheet 1: Program summary
    const summaryColumns = [
      { header: "البرنامج", key: "name", width: 22 },
      { header: "الوصف", key: "description", width: 30 },
      { header: "تاريخ البداية", key: "startDate", width: 14 },
      { header: "تاريخ النهاية", key: "endDate", width: 14 },
      { header: "الفئات المستهدفة", key: "categories", width: 20 },
      { header: "إجمالي التوزيعات", key: "totalDisbursements", width: 14 },
    ];

    const summaryRows = programs.map((p) => ({
      name: p.name,
      description: p.description || "",
      startDate: p.startDate || "",
      endDate: p.endDate || "",
      categories: (p.categories || []).map((c) => c.name).join("، "),
      totalDisbursements: p.disbursements?.length || 0,
    }));

    // Sheet 2: Each disbursement row
    const detailColumns = [
      { header: "البرنامج", key: "program", width: 22 },
      { header: "رقم المستفيد", key: "beneficiaryNumber", width: 16 },
      { header: "إسم المستفيد", key: "beneficiaryName", width: 25 },
      { header: "رقم الهوية", key: "nationalId", width: 14 },
      { header: "الموظف", key: "employee", width: 20 },
      { header: "المستلم", key: "receiver", width: 20 },
      { header: "تاريخ الصرف", key: "date", width: 18 },
      { header: "ملاحظات", key: "notes", width: 22 },
    ];

    const detailRows = [];
    for (const p of programs) {
      for (const d of p.disbursements || []) {
        detailRows.push({
          program: p.name,
          beneficiaryNumber: d.beneficiary?.beneficiaryNumber || "",
          beneficiaryName: d.beneficiary?.name || "",
          nationalId: d.beneficiary?.nationalId || "",
          employee: d.disbursedBy?.name || "",
          receiver: d.receiverName || "صاحب الملف",
          date: new Date(d.disbursedAt).toLocaleString("ar-SA"),
          notes: d.notes || "",
        });
      }
    }

    const buffer = await createExcelBuffer([
      { name: "ملخص البرامج", columns: summaryColumns, rows: summaryRows },
      { name: "تفاصيل التوزيعات", columns: detailColumns, rows: detailRows },
    ]);

    const fileName = `تقرير_البرامج_${Date.now()}.xlsx`;
    const filePath = path.join(REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
};

// ── 5. Employees Excel report (2 sheets: summary + disbursements) ──

const exportEmployeesReport = async (req, res, next) => {
  try {
    cleanOldFiles(REPORTS_DIR, 24);
    const { userIds } = req.body;

    const where = {};
    if (Array.isArray(userIds) && userIds.length > 0) {
      where.disbursedById = { [Op.in]: userIds.map(Number) };
    }

    const disbursements = await Disbursement.findAll({
      where,
      include: [
        {
          model: Beneficiary,
          as: "beneficiary",
          attributes: ["beneficiaryNumber", "name", "nationalId"],
        },
        { model: Program, as: "program", attributes: ["name"] },
        {
          model: User,
          as: "disbursedBy",
          attributes: ["id", "name", "email", "nationalId"],
        },
      ],
      order: [
        ["disbursedById", "ASC"],
        ["disbursedAt", "DESC"],
      ],
    });

    if (disbursements.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "لا توجد عمليات صرف" });
    }

    // Group by employee for summary
    const empMap = new Map();
    for (const d of disbursements) {
      const emp = d.disbursedBy;
      if (!emp) continue;
      if (!empMap.has(emp.id)) {
        empMap.set(emp.id, {
          name: emp.name || "",
          email: emp.email || "",
          nationalId: emp.nationalId || "",
          total: 0,
        });
      }
      empMap.get(emp.id).total++;
    }

    // Sheet 1: Employee summary
    const summaryColumns = [
      { header: "الموظف", key: "name", width: 22 },
      { header: "إيميل الموظف", key: "email", width: 25 },
      { header: "هوية الموظف", key: "nationalId", width: 14 },
      { header: "إجمالي التوزيعات", key: "total", width: 14 },
    ];

    const summaryRows = [...empMap.values()];

    // Sheet 2: Each disbursement row
    const detailColumns = [
      { header: "الموظف", key: "employee", width: 22 },
      { header: "البرنامج", key: "program", width: 22 },
      { header: "رقم المستفيد", key: "beneficiaryNumber", width: 16 },
      { header: "إسم المستفيد", key: "beneficiaryName", width: 25 },
      { header: "هوية المستفيد", key: "nationalId", width: 14 },
      { header: "المستلم", key: "receiver", width: 20 },
      { header: "تاريخ الصرف", key: "date", width: 18 },
      { header: "ملاحظات", key: "notes", width: 22 },
    ];

    const detailRows = disbursements.map((d) => ({
      employee: d.disbursedBy?.name || "",
      program: d.program?.name || "",
      beneficiaryNumber: d.beneficiary?.beneficiaryNumber || "",
      beneficiaryName: d.beneficiary?.name || "",
      nationalId: d.beneficiary?.nationalId || "",
      receiver: d.receiverName || "صاحب الملف",
      date: new Date(d.disbursedAt).toLocaleString("ar-SA"),
      notes: d.notes || "",
    }));

    const buffer = await createExcelBuffer([
      { name: "ملخص الموظفين", columns: summaryColumns, rows: summaryRows },
      { name: "تفاصيل التوزيعات", columns: detailColumns, rows: detailRows },
    ]);

    const fileName = `تقرير_الموظفين_${Date.now()}.xlsx`;
    const filePath = path.join(REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFilterFields,
  filterBeneficiaries,
  exportBeneficiariesReport,
  exportProgramsReport,
  exportEmployeesReport,
};
