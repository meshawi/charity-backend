/**
 * SYSTEM SEEDER
 * Creates permissions, hardcoded roles, admin user, field configs, and dummy data
 * Run with: node src/seeders/seedAdmin.js
 */

require("dotenv").config();
const {
  sequelize,
  Permission,
  Role,
  User,
  FieldConfig,
  Category,
  Program,
  Beneficiary,
  Dependent,
  Disbursement,
  CategoryAssignment,
} = require("../models");

const permissions = [
  { name: "create_user", label: "إنشاء مستخدم", description: "إنشاء حسابات مستخدمين جديدة في النظام" },
  { name: "view_users", label: "عرض المستخدمين", description: "عرض قائمة المستخدمين وبياناتهم" },
  { name: "edit_user", label: "تعديل مستخدم", description: "تعديل بيانات المستخدمين وإعادة تعيين كلمات المرور" },
  { name: "delete_user", label: "حذف مستخدم", description: "حذف حسابات المستخدمين من النظام" },
  { name: "manage_roles", label: "إدارة الأدوار", description: "عرض الأدوار والصلاحيات المتاحة" },
  { name: "create_profile", label: "إنشاء ملف", description: "إنشاء ملفات مستفيدين جديدة" },
  { name: "view_profiles", label: "عرض الملفات", description: "عرض بيانات المستفيدين والتابعين والمستندات" },
  { name: "edit_profile", label: "تعديل ملف", description: "تعديل بيانات المستفيدين والتابعين" },
  { name: "delete_profile", label: "حذف ملف", description: "حذف ملفات المستفيدين من النظام" },
  { name: "manage_categories", label: "إدارة الفئات", description: "تعديل أوصاف الفئات" },
  { name: "manage_programs", label: "إدارة البرامج", description: "إنشاء وتعديل وحذف البرامج وربطها بالفئات" },
  { name: "process_disbursement", label: "معالجة الصرف", description: "توزيع البرامج للمستفيدين وإصدار إقرارات الاستلام" },
  { name: "view_disbursements", label: "عرض المدفوعات", description: "عرض سجل التوزيعات وتفاصيلها" },
  { name: "manage_field_config", label: "إدارة إعدادات الحقول", description: "التحكم بالحقول المطلوبة عند إنشاء المستفيدين" },
  { name: "assign_category", label: "تعيين الفئة", description: "تعيين أو تغيير فئة المستفيد" },
  { name: "view_reports", label: "عرض التقارير", description: "عرض وتصدير التقارير بصيغة Excel" },
  { name: "view_dashboard", label: "عرض لوحة المعلومات", description: "عرض إحصائيات ورسوم بيانية لوحة المعلومات" },
];

const roles = [
  {
    name: "مدير النظام",
    description: "صلاحيات كاملة على النظام",
    permissions: "all",
  },
  {
    name: "مدير المستخدمين",
    description: "إنشاء وتعديل وحذف المستخدمين وإدارة الأدوار",
    permissions: [
      "create_user", "view_users", "edit_user", "delete_user", "manage_roles",
    ],
  },
  {
    name: "مدير البرامج",
    description: "إنشاء وتعديل وحذف البرامج وإدارة الفئات",
    permissions: [
      "manage_programs", "manage_categories",
    ],
  },
  {
    name: "باحث",
    description: "إنشاء وتعديل بيانات المستفيدين والتابعين",
    permissions: [
      "create_profile", "view_profiles", "edit_profile", "manage_field_config",
    ],
  },
  {
    name: "لجنة المراجعة",
    description: "عرض بيانات المستفيدين وتعيين/تغيير الفئة فقط",
    permissions: [
      "view_profiles", "assign_category",
    ],
  },
  {
    name: "موزع",
    description: "توزيع البرامج للمستفيدين فقط",
    permissions: [
      "process_disbursement",
    ],
  },
  {
    name: "مدير التقارير",
    description: "عرض سجل التوزيعات والتقارير",
    permissions: [
      "view_disbursements", "view_reports", "view_profiles",
    ],
  },
];

const beneficiaryFields = [
  { fieldName: "nationalId", fieldLabel: "رقم الهوية", isRequired: true },
  { fieldName: "name", fieldLabel: "الإسم" },
  { fieldName: "gender", fieldLabel: "النوع" },
  { fieldName: "dateOfBirth", fieldLabel: "تاريخ الميلاد" },
  { fieldName: "maritalStatus", fieldLabel: "الحالة الاجتماعية" },
  { fieldName: "phone", fieldLabel: "رقم الجوال" },
  { fieldName: "otherPhone", fieldLabel: "جوال آخر" },
  { fieldName: "familyCount", fieldLabel: "عدد الأسرة" },
  { fieldName: "dependentsCount", fieldLabel: "عدد التابعين" },
  { fieldName: "iban", fieldLabel: "رقم الآيبان" },
  { fieldName: "bank", fieldLabel: "البنك" },
  { fieldName: "residenceArea", fieldLabel: "جهة السكن بالطرف" },
  { fieldName: "buildingOwnership", fieldLabel: "ملكية البناء" },
  { fieldName: "buildingType", fieldLabel: "نوع البناء" },
  { fieldName: "buildingCondition", fieldLabel: "حالة البناء" },
  { fieldName: "buildingCapacity", fieldLabel: "اتساع البناء" },
  { fieldName: "husbandReligious", fieldLabel: "الزيارات الدينية (الزوج)" },
  { fieldName: "wifeReligious", fieldLabel: "الزيارات الدينية (الزوجة)" },
  { fieldName: "furnitureAppliances", fieldLabel: "الأثاث والأجهزة والممتلكات" },
  { fieldName: "incomeSources", fieldLabel: "مصادر الدخل" },
  { fieldName: "financialObligations", fieldLabel: "الالتزامات المالية" },
  { fieldName: "healthStatus", fieldLabel: "الحالة الصحية" },
  { fieldName: "origin", fieldLabel: "الأصل" },
  { fieldName: "attributes", fieldLabel: "الصفات" },
  { fieldName: "enrollment", fieldLabel: "التسجيل" },
  { fieldName: "visitDate", fieldLabel: "تاريخ الزيارة" },
  { fieldName: "updateDone", fieldLabel: "هل تم التحديث" },
  { fieldName: "nextUpdate", fieldLabel: "التحديث القادم" },
  { fieldName: "specialDate", fieldLabel: "تاريخ مميز" },
  { fieldName: "familySkillsTalents", fieldLabel: "المهن والمواهب لأفراد العائلة" },
  { fieldName: "researcherNotes", fieldLabel: "ملاحظات وتوصيات الباحث" },
  { fieldName: "notes", fieldLabel: "ملاحظات" },
];

const dependentFields = [
  { fieldName: "name", fieldLabel: "الإسم" },
  { fieldName: "nationalId", fieldLabel: "رقم الهوية" },
  { fieldName: "gender", fieldLabel: "النوع" },
  { fieldName: "dateOfBirth", fieldLabel: "تاريخ الميلاد" },
  { fieldName: "relationship", fieldLabel: "صلة القرابة" },
  { fieldName: "dependentMaritalStatus", fieldLabel: "الحالة الاجتماعية" },
  { fieldName: "schoolName", fieldLabel: "اسم المدرسة" },
  { fieldName: "schoolGrade", fieldLabel: "الصف الدراسي" },
  { fieldName: "schoolType", fieldLabel: "نوع المدرسة" },
  { fieldName: "academicGrade", fieldLabel: "التقدير الدراسي" },
  { fieldName: "weaknessSubjects", fieldLabel: "مواد الضعف" },
  { fieldName: "educationStatus", fieldLabel: "الحالة التعليمية" },
  { fieldName: "healthStatus", fieldLabel: "الحالة الصحية" },
  { fieldName: "religious", fieldLabel: "الزيارات الدينية (التابع)" },
  { fieldName: "notes", fieldLabel: "ملاحظات" },
];

const seed = async () => {
  try {
    console.log("Starting system seeder...\n");

    await sequelize.authenticate();
    console.log("Database connected");

    await sequelize.sync({ force: true });
    console.log("Database synced (tables recreated)\n");

    // 1. Create permissions
    const createdPermissions = await Permission.bulkCreate(permissions);
    const permMap = new Map(createdPermissions.map((p) => [p.name, p]));
    console.log(`Created ${createdPermissions.length} permissions`);

    // 2. Create roles with permissions
    for (const roleDef of roles) {
      const role = await Role.create({
        name: roleDef.name,
        description: roleDef.description,
      });

      if (roleDef.permissions === "all") {
        await role.addPermissions(createdPermissions);
      } else {
        const rolePerms = roleDef.permissions
          .map((name) => permMap.get(name))
          .filter(Boolean);
        await role.addPermissions(rolePerms);
      }
      console.log(`Created role: ${roleDef.name}`);
    }

    // 3. Create admin user
    const adminRole = await Role.findOne({ where: { name: "مدير النظام" } });
    const adminUser = await User.create({
      email: "admin@charity.com",
      password: "admin123",
      name: "مدير النظام",
      nationalId: "1234567890",
      isActive: true,
      isSuperAdmin: true,
    });
    await adminUser.addRole(adminRole);
    console.log("Created admin user");

    // 4. Seed field configs
    const fieldConfigs = [
      ...beneficiaryFields.map((f) => ({ ...f, fieldGroup: "beneficiary", isRequired: f.isRequired || false })),
      ...dependentFields.map((f) => ({ ...f, fieldGroup: "dependent", isRequired: false })),
    ];
    await FieldConfig.bulkCreate(fieldConfigs);
    console.log(`Created ${fieldConfigs.length} field configs`);

    // ===== DUMMY DATA =====
    console.log("\n--- Seeding dummy data ---\n");

    // 5. Create additional users
    const usersManagerRole = await Role.findOne({ where: { name: "مدير المستخدمين" } });
    const programManagerRole = await Role.findOne({ where: { name: "مدير البرامج" } });
    const researcherRole = await Role.findOne({ where: { name: "باحث" } });
    const reviewRole = await Role.findOne({ where: { name: "لجنة المراجعة" } });
    const distributorRole = await Role.findOne({ where: { name: "موزع" } });
    const reportManagerRole = await Role.findOne({ where: { name: "مدير التقارير" } });

    const user2 = await User.create({
      email: "users-mgr@charity.com",
      password: "123456",
      name: "خالد مدير المستخدمين",
      nationalId: "1111111111",
      isActive: true,
    });
    await user2.addRole(usersManagerRole);

    const user3 = await User.create({
      email: "researcher@charity.com",
      password: "123456",
      name: "سارة الباحثة",
      nationalId: "2222222222",
      isActive: true,
    });
    await user3.addRole(researcherRole);

    const user4 = await User.create({
      email: "distributor@charity.com",
      password: "123456",
      name: "محمد الموزع",
      nationalId: "3333333333",
      isActive: true,
    });
    await user4.addRole(distributorRole);

    const user5 = await User.create({
      email: "reviewer@charity.com",
      password: "123456",
      name: "نورة لجنة المراجعة",
      nationalId: "4444444444",
      isActive: true,
    });
    await user5.addRole(reviewRole);

    const user6 = await User.create({
      email: "prog-mgr@charity.com",
      password: "123456",
      name: "أحمد مدير البرامج",
      nationalId: "5555555555",
      isActive: true,
    });
    await user6.addRole(programManagerRole);

    const user7 = await User.create({
      email: "reports@charity.com",
      password: "123456",
      name: "فهد مدير التقارير",
      nationalId: "6666666666",
      isActive: true,
    });
    await user7.addRole(reportManagerRole);

    console.log("Created 6 additional users");

    // 6. Create categories
    const categoriesData = [
      { name: "أ", description: "الفئة أ", color: "#3b82f6" },
      { name: "ب", description: "الفئة ب", color: "#ef4444" },
      { name: "ت", description: "الفئة ت", color: "#10b981" },
      { name: "ج", description: "الفئة ج", color: "#f59e0b" },
      { name: "د", description: "الفئة د", color: "#8b5cf6" },
      { name: "و", description: "الفئة و", color: "#ec4899" },
    ];
    const createdCategories = await Category.bulkCreate(categoriesData);
    console.log(`Created ${createdCategories.length} categories`);

    // 7. Create programs
    const program1 = await Program.create({
      name: "دعم شهري",
      description: "برنامج دعم مالي شهري للمستفيدين",
      startDate: "2025-01-01",
      endDate: "2026-12-31",
      isActive: true,
    });
    await program1.setCategories([createdCategories[0], createdCategories[1]]);

    const program2 = await Program.create({
      name: "كسوة الشتاء",
      description: "برنامج كسوة الشتاء السنوي",
      startDate: "2025-10-01",
      endDate: "2026-03-31",
      isActive: true,
    });
    await program2.setCategories([createdCategories[0], createdCategories[2], createdCategories[3]]);

    const program3 = await Program.create({
      name: "سلة غذائية",
      description: "توزيع سلال غذائية رمضانية",
      startDate: "2026-02-15",
      endDate: "2026-04-15",
      isActive: true,
    });
    await program3.setCategories([createdCategories[1], createdCategories[4]]);

    const program4 = await Program.create({
      name: "إعانة إيجار",
      description: "دعم إيجارات السكن للمحتاجين",
      startDate: "2025-06-01",
      endDate: "2026-06-01",
      isActive: true,
    });
    // Added category أ so the test beneficiary (#9) can demonstrate "valid" case
    await program4.setCategories([createdCategories[0], createdCategories[2], createdCategories[5]]);

    const program5 = await Program.create({
      name: "برنامج منتهي",
      description: "برنامج قديم انتهت صلاحيته",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      isActive: false,
    });
    await program5.setCategories([createdCategories[3]]);

    console.log("Created 5 programs");

    // 8. Create beneficiaries (with new fields)
    const beneficiariesData = [
      {
        beneficiaryNumber: "2025_000001",
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
          hajj: { done: true, visitDate: "2019-08-10", updateDate: "2024-06-01", nextUpdate: "2025-06-01" },
          umrah: { done: true, visitDate: "2023-03-20", updateDate: "2024-06-01", nextUpdate: "2025-06-01" },
          prophetMosque: { done: true, visitDate: "2023-03-22", updateDate: "2024-06-01", nextUpdate: "2025-06-01" },
        },
        wifeReligious: {
          hajj: { done: false },
          umrah: { done: true, visitDate: "2023-03-20", updateDate: "2024-06-01", nextUpdate: "2025-06-01" },
          prophetMosque: { done: true, visitDate: "2023-03-22", updateDate: "2024-06-01", nextUpdate: "2025-06-01" },
        },
        furnitureAppliances: {
          windowAC: { good: 2, unavailable: 0, needsRepair: 1, needsReplacement: 0, notes: "" },
          splitAC: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          washingMachines: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          refrigerators: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          fans: { good: 3, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          freezers: { good: 0, unavailable: 1, needsRepair: 0, needsReplacement: 0, notes: "" },
          ovens: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          heaters: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          spaceHeaters: { good: 0, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          computers: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          phones: { good: 2, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          tvScreens: { good: 2, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          mattresses: { good: 4, unavailable: 0, needsRepair: 1, needsReplacement: 0, notes: "" },
          wardrobes: { good: 3, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          blankets: { good: 6, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          cars: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "كامري 2018" },
        },
        incomeSources: {
          salary: { monthly: 0, yearly: 0, notes: "" },
          socialInsurance: { monthly: 0, yearly: 0, notes: "" },
          modernSocialSecurity: { monthly: 1500, yearly: 18000, notes: "" },
          citizenAccount: { monthly: 900, yearly: 10800, notes: "" },
          pension: { monthly: 0, yearly: 0, notes: "" },
          disabilityAid: { monthly: 0, yearly: 0, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 1100, yearly: 13200, notes: "أعمال صيانة" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 2000, yearly: 24000, notes: "" },
          loanPayment: { monthly: 0, yearly: 0, notes: "" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        healthStatus: "بصحة جيدة",
        familySkillsTalents: "الأب يعمل في الصيانة العامة",
        categoryId: createdCategories[0].id,
        status: "approved",
        createdById: adminUser.id,
      },
      {
        beneficiaryNumber: "2025_000002",
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
        buildingOwnership: "rented",
        buildingType: "arabic",
        buildingCondition: "average",
        buildingCapacity: "medium",
        incomeSources: {
          salary: { monthly: 0, yearly: 0, notes: "" },
          socialInsurance: { monthly: 0, yearly: 0, notes: "" },
          modernSocialSecurity: { monthly: 2000, yearly: 24000, notes: "" },
          citizenAccount: { monthly: 0, yearly: 0, notes: "" },
          pension: { monthly: 0, yearly: 0, notes: "" },
          disabilityAid: { monthly: 0, yearly: 0, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 1500, yearly: 18000, notes: "" },
          loanPayment: { monthly: 0, yearly: 0, notes: "" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        categoryId: createdCategories[1].id,
        status: "approved",
        createdById: adminUser.id,
      },
      {
        beneficiaryNumber: "2025_000003",
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
        buildingOwnership: "private",
        buildingType: "arabic",
        buildingCondition: "needs_repair",
        buildingCapacity: "small",
        healthStatus: "يعاني من السكري",
        incomeSources: {
          salary: { monthly: 0, yearly: 0, notes: "" },
          socialInsurance: { monthly: 0, yearly: 0, notes: "" },
          modernSocialSecurity: { monthly: 2500, yearly: 30000, notes: "" },
          citizenAccount: { monthly: 1000, yearly: 12000, notes: "" },
          pension: { monthly: 0, yearly: 0, notes: "" },
          disabilityAid: { monthly: 500, yearly: 6000, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 2500, yearly: 30000, notes: "" },
          loanPayment: { monthly: 0, yearly: 0, notes: "" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        categoryId: createdCategories[0].id,
        status: "approved",
        createdById: user3.id,
      },
      {
        beneficiaryNumber: "2025_000004",
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
        incomeSources: {
          salary: { monthly: 0, yearly: 0, notes: "" },
          socialInsurance: { monthly: 0, yearly: 0, notes: "" },
          modernSocialSecurity: { monthly: 1800, yearly: 21600, notes: "" },
          citizenAccount: { monthly: 900, yearly: 10800, notes: "" },
          pension: { monthly: 0, yearly: 0, notes: "" },
          disabilityAid: { monthly: 0, yearly: 0, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 1800, yearly: 21600, notes: "" },
          loanPayment: { monthly: 0, yearly: 0, notes: "" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        categoryId: createdCategories[2].id,
        status: "approved",
        createdById: user3.id,
      },
      {
        beneficiaryNumber: "2025_000005",
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
          hajj: { done: true, visitDate: "2015-09-20", updateDate: "2023-01-01", nextUpdate: "2025-01-01" },
          umrah: { done: true, visitDate: "2022-04-10", updateDate: "2023-01-01", nextUpdate: "2025-01-01" },
          prophetMosque: { done: false },
        },
        incomeSources: {
          salary: { monthly: 0, yearly: 0, notes: "" },
          socialInsurance: { monthly: 0, yearly: 0, notes: "" },
          modernSocialSecurity: { monthly: 1200, yearly: 14400, notes: "" },
          citizenAccount: { monthly: 800, yearly: 9600, notes: "" },
          pension: { monthly: 500, yearly: 6000, notes: "" },
          disabilityAid: { monthly: 0, yearly: 0, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 1200, yearly: 14400, notes: "" },
          loanPayment: { monthly: 0, yearly: 0, notes: "" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        categoryId: createdCategories[3].id,
        status: "approved",
        createdById: adminUser.id,
      },
      {
        beneficiaryNumber: "2025_000006",
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
        incomeSources: {
          salary: { monthly: 3000, yearly: 36000, notes: "" },
          socialInsurance: { monthly: 0, yearly: 0, notes: "" },
          modernSocialSecurity: { monthly: 0, yearly: 0, notes: "" },
          citizenAccount: { monthly: 0, yearly: 0, notes: "" },
          pension: { monthly: 0, yearly: 0, notes: "" },
          disabilityAid: { monthly: 0, yearly: 0, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 2200, yearly: 26400, notes: "" },
          loanPayment: { monthly: 0, yearly: 0, notes: "" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        categoryId: createdCategories[4].id,
        status: "approved",
        createdById: user2.id,
      },
      {
        beneficiaryNumber: "2026_000001",
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
        buildingOwnership: "rented",
        buildingType: "concrete",
        buildingCondition: "average",
        buildingCapacity: "small",
        notes: "يتيم - بحاجة لدعم عاجل",
        categoryId: createdCategories[5].id,
        status: "approved",
        createdById: user2.id,
      },
      {
        beneficiaryNumber: "2026_000002",
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
        buildingOwnership: "rented",
        buildingType: "arabic",
        buildingCondition: "needs_repair",
        buildingCapacity: "small",
        incomeSources: {
          salary: { monthly: 0, yearly: 0, notes: "" },
          socialInsurance: { monthly: 0, yearly: 0, notes: "" },
          modernSocialSecurity: { monthly: 2200, yearly: 26400, notes: "" },
          citizenAccount: { monthly: 0, yearly: 0, notes: "" },
          pension: { monthly: 0, yearly: 0, notes: "" },
          disabilityAid: { monthly: 0, yearly: 0, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 1600, yearly: 19200, notes: "" },
          loanPayment: { monthly: 0, yearly: 0, notes: "" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        categoryId: createdCategories[1].id,
        status: "approved",
        createdById: adminUser.id,
      },
      // Beneficiary #9: TEST CASE — covers all 4 disbursement scenarios
      // P1 (دعم شهري, cats أ,ب) → already received (case 1)
      // P2 (كسوة الشتاء, cats أ,ت,ج) → family dedup (case 3) — dependent's NID = beneficiary 3 who received from P2
      // P3 (سلة غذائية, cats ب,د) → not qualified (case 2) — cat أ not in [ب,د]
      // P4 (إعانة إيجار, cats أ,ت,و) → valid, can receive (case 4)
      {
        beneficiaryNumber: "2026_000003",
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
          umrah: { done: true, visitDate: "2024-01-10", updateDate: "2024-06-01", nextUpdate: "2025-06-01" },
          prophetMosque: { done: false },
        },
        wifeReligious: {
          hajj: { done: false },
          umrah: { done: false },
          prophetMosque: { done: false },
        },
        furnitureAppliances: {
          windowAC: { good: 1, unavailable: 0, needsRepair: 1, needsReplacement: 0, notes: "" },
          splitAC: { good: 0, unavailable: 1, needsRepair: 0, needsReplacement: 0, notes: "" },
          washingMachines: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          refrigerators: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          fans: { good: 2, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          freezers: { good: 0, unavailable: 1, needsRepair: 0, needsReplacement: 0, notes: "" },
          ovens: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          heaters: { good: 0, unavailable: 0, needsRepair: 1, needsReplacement: 0, notes: "" },
          spaceHeaters: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          computers: { good: 0, unavailable: 1, needsRepair: 0, needsReplacement: 0, notes: "" },
          phones: { good: 2, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          tvScreens: { good: 1, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          mattresses: { good: 3, unavailable: 0, needsRepair: 0, needsReplacement: 1, notes: "" },
          wardrobes: { good: 2, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          blankets: { good: 4, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "" },
          cars: { good: 0, unavailable: 0, needsRepair: 0, needsReplacement: 0, notes: "لا يملك سيارة" },
        },
        incomeSources: {
          salary: { monthly: 0, yearly: 0, notes: "" },
          socialInsurance: { monthly: 1500, yearly: 18000, notes: "" },
          modernSocialSecurity: { monthly: 0, yearly: 0, notes: "" },
          citizenAccount: { monthly: 700, yearly: 8400, notes: "" },
          pension: { monthly: 0, yearly: 0, notes: "" },
          disabilityAid: { monthly: 0, yearly: 0, notes: "" },
          alimony: { monthly: 0, yearly: 0, notes: "" },
          freelance: { monthly: 500, yearly: 6000, notes: "بيع بسيط" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        financialObligations: {
          rent: { monthly: 1800, yearly: 21600, notes: "" },
          loanPayment: { monthly: 500, yearly: 6000, notes: "قرض شخصي" },
          carInstallment: { monthly: 0, yearly: 0, notes: "" },
          domesticWorker: { monthly: 0, yearly: 0, notes: "" },
          other: { monthly: 0, yearly: 0, notes: "" },
        },
        researcherNotes: "مستفيد اختباري — يغطي جميع حالات الصرف الأربع",
        categoryId: createdCategories[0].id,
        status: "approved",
        createdById: adminUser.id,
      },
    ];

    const createdBeneficiaries = await Beneficiary.bulkCreate(beneficiariesData);
    console.log(`Created ${createdBeneficiaries.length} beneficiaries`);

    // Record category assignments for all beneficiaries
    const categoryAssignments = createdBeneficiaries.map((b, i) => ({
      beneficiaryId: b.id,
      categoryId: beneficiariesData[i].categoryId,
      previousCategoryId: null,
      assignedById: beneficiariesData[i].createdById,
      note: "تعيين أولي عند إنشاء الملف",
      createdAt: beneficiariesData[i].createdAt,
      updatedAt: beneficiariesData[i].createdAt,
    }));
    await CategoryAssignment.bulkCreate(categoryAssignments);
    console.log(`Created ${categoryAssignments.length} category assignments`);

    // ===== ADDITIONAL HISTORICAL BENEFICIARIES (2023–2025) =====
    console.log("\n--- Generating historical beneficiaries ---\n");

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
    const areas = ["aldeira", "aladwa", "alrashidia", "alabadia", "alsaadoon", "aliskan", "aldahia", "aldana"];
    const ownerships = ["private", "shared", "rented"];
    const buildTypes = ["arabic", "concrete"];
    const buildConditions = ["good", "average", "needs_repair"];
    const buildCapacities = ["small", "medium", "sufficient"];
    const creators = [adminUser, user2, user3, user5, user6];

    const extraCount = 40;
    const genStart = new Date("2025-01-15").getTime();
    const genEnd = new Date("2026-03-15").getTime();
    const genStep = (genEnd - genStart) / extraCount;
    const yearCounters = { 2025: 6, 2026: 3 };

    const extraBeneficiaries = [];
    for (let i = 0; i < extraCount; i++) {
      const dt = new Date(genStart + genStep * i);
      const yr = dt.getFullYear();
      yearCounters[yr] = (yearCounters[yr] || 0) + 1;

      // Make some beneficiaries draft (incomplete) or pending_review
      let status = "approved";
      let categoryId = createdCategories[i % createdCategories.length].id;
      let phone = `050${String(1000001 + i)}`;
      let iban = undefined;
      let bank = i % 2 === 0 ? "الراجحي" : "الأهلي";

      // Indices 30-33: people who didn't fill their name (only nationalId)
      let name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
      if (i >= 30 && i <= 33) {
        name = null;
      }

      // Indices 34-35: approved but never received any disbursement
      // (no special field changes — they just won't get disbursements below)

      if (i >= 36 && i <= 37) {
        // Draft — incomplete, no category, missing some fields
        status = "draft";
        categoryId = null;
        phone = null;
        bank = null;
        name = null; // drafts also have no name
      } else if (i >= 38 && i <= 39) {
        // Pending review — has category, complete data
        status = "pending_review";
      }

      extraBeneficiaries.push({
        beneficiaryNumber: `${yr}_${String(yearCounters[yr]).padStart(6, "0")}`,
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
        categoryId,
        status,
        createdById: creators[i % creators.length].id,
        createdAt: dt,
        updatedAt: dt,
      });
    }

    const extraCreated = await Beneficiary.bulkCreate(extraBeneficiaries);
    console.log(`Created ${extraCreated.length} additional historical beneficiaries`);

    const extraAssignments = extraCreated
      .map((b, i) => {
        if (!extraBeneficiaries[i].categoryId) return null; // skip draft (no category)
        return {
          beneficiaryId: b.id,
          categoryId: extraBeneficiaries[i].categoryId,
          previousCategoryId: null,
          assignedById: extraBeneficiaries[i].createdById,
          note: "تعيين أولي عند إنشاء الملف",
          createdAt: extraBeneficiaries[i].createdAt,
          updatedAt: extraBeneficiaries[i].createdAt,
        };
      })
      .filter(Boolean);
    await CategoryAssignment.bulkCreate(extraAssignments);
    console.log(`Created ${extraAssignments.length} additional category assignments`);

    // 9. Create dependents
    const dependentsData = [
      // Beneficiary 1 dependents
      { beneficiaryId: createdBeneficiaries[0].id, name: "سعد عبدالله الغامدي", nationalId: "1198765001", gender: "male", dateOfBirth: "2007-05-12", relationship: "son", educationStatus: "enrolled", schoolName: "ثانوية الملك فهد", schoolGrade: "ثالث ثانوي", schoolType: "public", academicGrade: "جيد جداً", religious: { hajj: { done: false, lastYear: "" }, umrah: { done: true, lastYear: "1445" }, prophetMosque: { done: true, lastYear: "1445" } } },
      { beneficiaryId: createdBeneficiaries[0].id, name: "ريم عبدالله الغامدي", nationalId: "1198765002", gender: "female", dateOfBirth: "2011-08-03", relationship: "daughter", educationStatus: "enrolled", schoolName: "متوسطة النور", schoolGrade: "ثاني متوسط", schoolType: "public", academicGrade: "ممتاز", weaknessSubjects: "الرياضيات" },
      { beneficiaryId: createdBeneficiaries[0].id, name: "خالد عبدالله الغامدي", nationalId: "1198765003", gender: "male", dateOfBirth: "2015-01-20", relationship: "son", educationStatus: "enrolled", schoolName: "ابتدائية الأمل", schoolGrade: "رابع ابتدائي", schoolType: "public", academicGrade: "جيد" },
      // Beneficiary 2 dependents
      { beneficiaryId: createdBeneficiaries[1].id, name: "أحمد فاطمة العتيبي", nationalId: "1198765004", gender: "male", dateOfBirth: "2009-03-10", relationship: "son", educationStatus: "enrolled" },
      { beneficiaryId: createdBeneficiaries[1].id, name: "سارة فاطمة العتيبي", nationalId: "1198765005", gender: "female", dateOfBirth: "2013-06-15", relationship: "daughter", educationStatus: "enrolled", dependentMaritalStatus: "عزباء" },
      // Beneficiary 3 dependents
      { beneficiaryId: createdBeneficiaries[2].id, name: "عمر صالح الدوسري", nationalId: "1198765006", gender: "male", dateOfBirth: "2003-10-08", relationship: "son", educationStatus: "graduated", dependentMaritalStatus: "أعزب", religious: { hajj: { done: true, lastYear: "1444" }, umrah: { done: true, lastYear: "1445" }, prophetMosque: { done: false, lastYear: "" } } },
      { beneficiaryId: createdBeneficiaries[2].id, name: "هند صالح الدوسري", nationalId: "1198765007", gender: "female", dateOfBirth: "2005-04-22", relationship: "daughter", educationStatus: "enrolled", healthStatus: "حالة مستقرة" },
      { beneficiaryId: createdBeneficiaries[2].id, name: "ماجد صالح الدوسري", nationalId: "1198765008", gender: "male", dateOfBirth: "2010-12-01", relationship: "son", educationStatus: "enrolled", weaknessSubjects: "اللغة الإنجليزية" },
      // Beneficiary 4 dependents
      { beneficiaryId: createdBeneficiaries[3].id, name: "لمى نورة القحطاني", nationalId: "1198765009", gender: "female", dateOfBirth: "2017-07-30", relationship: "daughter", educationStatus: "enrolled", schoolType: "public" },
      { beneficiaryId: createdBeneficiaries[3].id, name: "تركي نورة القحطاني", nationalId: "1198765010", gender: "male", dateOfBirth: "2020-11-15", relationship: "son", educationStatus: "not_enrolled" },
      // Beneficiary 6 dependents
      { beneficiaryId: createdBeneficiaries[5].id, name: "ياسر مريم الزهراني", nationalId: "1198765011", gender: "male", dateOfBirth: "2006-02-14", relationship: "son", educationStatus: "enrolled" },
      { beneficiaryId: createdBeneficiaries[5].id, name: "أمل مريم الزهراني", nationalId: "1198765012", gender: "female", dateOfBirth: "2009-09-25", relationship: "daughter", educationStatus: "enrolled" },
      { beneficiaryId: createdBeneficiaries[5].id, name: "فيصل مريم الزهراني", nationalId: "1198765013", gender: "male", dateOfBirth: "2014-05-07", relationship: "son", educationStatus: "enrolled" },
      // Beneficiary 9 dependents (test beneficiary)
      // Dependent with nationalId matching beneficiary 3 (صالح) → triggers family dedup for program 2
      { beneficiaryId: createdBeneficiaries[8].id, name: "صالح عمر الدوسري", nationalId: "1098765434", gender: "male", dateOfBirth: "1970-11-05", relationship: "other", relationshipOther: "قريب", dependentMaritalStatus: "متزوج", religious: { hajj: { done: true, lastYear: "1443" }, umrah: { done: true, lastYear: "1445" }, prophetMosque: { done: true, lastYear: "1444" } } },
      { beneficiaryId: createdBeneficiaries[8].id, name: "نوف محمد الحربي", nationalId: "1198765014", gender: "female", dateOfBirth: "2012-08-18", relationship: "daughter", educationStatus: "enrolled", schoolType: "public", schoolName: "ابتدائية الأندلس", schoolGrade: "سادس ابتدائي" },
    ];

    await Dependent.bulkCreate(dependentsData);
    console.log(`Created ${dependentsData.length} dependents`);

    // 10. Create disbursements (spread across 2025–2026)
    const disbursementsData = [
      { beneficiaryId: createdBeneficiaries[0].id, programId: program1.id, disbursedById: adminUser.id, disbursedAt: "2025-02-01", createdAt: new Date("2025-02-01"), updatedAt: new Date("2025-02-01"), notes: "صرف شهر فبراير" },
      { beneficiaryId: createdBeneficiaries[0].id, programId: program1.id, disbursedById: user4.id, disbursedAt: "2025-03-01", createdAt: new Date("2025-03-01"), updatedAt: new Date("2025-03-01"), notes: "صرف شهر مارس" },
      { beneficiaryId: createdBeneficiaries[1].id, programId: program1.id, disbursedById: user4.id, disbursedAt: "2025-04-01", createdAt: new Date("2025-04-01"), updatedAt: new Date("2025-04-01") },
      { beneficiaryId: createdBeneficiaries[1].id, programId: program3.id, disbursedById: adminUser.id, disbursedAt: "2026-03-05", createdAt: new Date("2026-03-05"), updatedAt: new Date("2026-03-05"), notes: "سلة رمضان" },
      { beneficiaryId: createdBeneficiaries[2].id, programId: program2.id, disbursedById: user4.id, disbursedAt: "2025-11-01", createdAt: new Date("2025-11-01"), updatedAt: new Date("2025-11-01"), notes: "كسوة شتاء" },
      { beneficiaryId: createdBeneficiaries[3].id, programId: program4.id, disbursedById: adminUser.id, disbursedAt: "2025-09-01", createdAt: new Date("2025-09-01"), updatedAt: new Date("2025-09-01"), notes: "إعانة إيجار الربع الثالث" },
      { beneficiaryId: createdBeneficiaries[4].id, programId: program1.id, disbursedById: user4.id, disbursedAt: "2025-10-15", createdAt: new Date("2025-10-15"), updatedAt: new Date("2025-10-15") },
      { beneficiaryId: createdBeneficiaries[5].id, programId: program2.id, disbursedById: user4.id, disbursedAt: "2025-12-01", createdAt: new Date("2025-12-01"), updatedAt: new Date("2025-12-01"), notes: "كسوة شتاء" },
      { beneficiaryId: createdBeneficiaries[6].id, programId: program1.id, disbursedById: adminUser.id, disbursedAt: "2026-02-01", createdAt: new Date("2026-02-01"), updatedAt: new Date("2026-02-01") },
      { beneficiaryId: createdBeneficiaries[7].id, programId: program3.id, disbursedById: user4.id, disbursedAt: "2026-03-10", createdAt: new Date("2026-03-10"), updatedAt: new Date("2026-03-10") },
      // Beneficiary 9 received from program 1 (test case 1: already received)
      { beneficiaryId: createdBeneficiaries[8].id, programId: program1.id, disbursedById: user4.id, disbursedAt: "2026-03-18", createdAt: new Date("2026-03-18"), updatedAt: new Date("2026-03-18"), notes: "صرف دعم شهري — مستفيد اختباري" },
    ];

    await Disbursement.bulkCreate(disbursementsData);
    console.log(`Created ${disbursementsData.length} disbursements`);

    // Generate historical disbursements for additional beneficiaries
    // Multiple disbursements can land on the same day; denser in last 60 days
    const allPrograms = [program1, program2, program3, program4];
    const distributors = [adminUser, user4];
    const extraDisbursements = [];
    const cutoff = new Date("2026-03-21");
    const recentStart = new Date("2026-01-20"); // last ~60 days

    // Indices 34-35 should never receive disbursements
    const noDisbursementIndices = new Set([34, 35]);
    const noDisbursementIds = new Set(
      [...noDisbursementIndices].map((idx) => extraCreated[idx].id)
    );

    // Phase 1: normal disbursements spread across the full range
    for (let i = 0; i < extraCreated.length; i++) {
      if (noDisbursementIndices.has(i)) continue; // skip no-disbursement beneficiaries
      const bDate = extraBeneficiaries[i].createdAt;
      const count = 1 + (i % 3); // 1-3 disbursements per beneficiary
      for (let j = 0; j < count; j++) {
        const offsetDays = 14 + j * 45; // 14, 59, 104 days after creation
        const disbDate = new Date(bDate.getTime() + offsetDays * 86400000);
        if (disbDate > cutoff) continue;
        extraDisbursements.push({
          beneficiaryId: extraCreated[i].id,
          programId: allPrograms[(i + j) % allPrograms.length].id,
          disbursedById: distributors[j % distributors.length].id,
          disbursedAt: disbDate.toISOString().slice(0, 10),
          createdAt: disbDate,
          updatedAt: disbDate,
        });
      }
    }

    // Phase 2: dense recent disbursements (last 60 days) — 2-5 per day on many days
    const recentMs = recentStart.getTime();
    const recentRange = cutoff.getTime() - recentMs;
    const allBeneficiaries = [...createdBeneficiaries, ...extraCreated];
    const recentNotes = ["صرف دوري", "صرف شهري", "توزيع سلال", "دعم إيجار", "كسوة", ""];

    for (let d = 0; d < 60; d++) {
      const dayDate = new Date(recentMs + d * 86400000);
      if (dayDate > cutoff) break;
      const dateStr = dayDate.toISOString().slice(0, 10);
      // 0-5 disbursements per day, averaging ~3
      const dayCount = (d * 7 + 3) % 6; // cycles: 3,4,5,0,1,2,3,4,5,...
      for (let k = 0; k < dayCount; k++) {
        const bIdx = (d * 3 + k) % allBeneficiaries.length;
        if (noDisbursementIds.has(allBeneficiaries[bIdx].id)) continue; // skip
        const pIdx = (d + k) % allPrograms.length;
        extraDisbursements.push({
          beneficiaryId: allBeneficiaries[bIdx].id,
          programId: allPrograms[pIdx].id,
          disbursedById: distributors[k % distributors.length].id,
          disbursedAt: dateStr,
          notes: recentNotes[(d + k) % recentNotes.length] || undefined,
          createdAt: dayDate,
          updatedAt: dayDate,
        });
      }
    }

    await Disbursement.bulkCreate(extraDisbursements);
    console.log(`Created ${extraDisbursements.length} additional historical disbursements`);

    console.log("\n========================================");
    console.log("System seeder completed successfully!");
    console.log("========================================\n");
    console.log("Login credentials:");
    console.log("  Admin:         admin@charity.com / admin123");
    console.log("  Users Mgr:     users-mgr@charity.com / 123456");
    console.log("  Researcher:    researcher@charity.com / 123456");
    console.log("  Distributor:   distributor@charity.com / 123456");
    console.log("  Reviewer:      reviewer@charity.com / 123456");
    console.log("  Program Mgr:   prog-mgr@charity.com / 123456");
    console.log("  Reports Mgr:   reports@charity.com / 123456");
    console.log("\nTest beneficiary (#9 - محمد عبدالرحمن الحربي, NID: 1098765440):");
    console.log("  P1 (دعم شهري)   → already received");
    console.log("  P2 (كسوة الشتاء) → family dedup (dependent = beneficiary 3 who received)");
    console.log("  P3 (سلة غذائية)  → not qualified (cat أ not in [ب,د])");
    console.log("  P4 (إعانة إيجار) → VALID, can receive");
    console.log("\nSpecial historical beneficiaries (extra indices):");
    console.log("  30-33: No name (didn't fill their name)");
    console.log("  34-35: Never received disbursement");
    console.log("  36-37: Draft status (incomplete)");
    console.log("  38-39: Pending review");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("\nSeeder error:", error);
    process.exit(1);
  }
};

seed();
