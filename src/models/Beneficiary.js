const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Beneficiary = sequelize.define(
  "Beneficiary",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    beneficiaryNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "رقم المستفيد",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "الإسم",
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "الفئة",
    },
    gender: {
      type: DataTypes.ENUM("male", "female"),
      allowNull: true,
      comment: "النوع",
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "تاريخ الميلاد",
    },
    maritalStatus: {
      type: DataTypes.ENUM("married", "single", "divorced", "widowed", "abandoned"),
      allowNull: true,
      comment: "الحالة الاجتماعية",
    },
    nationalId: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: "رقم الهوية",
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "رقم الجوال",
    },
    otherPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "جوال آخر",
    },
    otherPhoneRelationship: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "صلة صاحب الجوال الآخر",
    },
    familyCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "عدد الأسرة",
    },
    dependentsCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "عدد التابعين",
    },
    iban: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "رقم الآيبان",
    },
    bank: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "البنك",
    },
    // --- جهة السكن ---
    residenceArea: {
      type: DataTypes.ENUM(
        "aldeira", "aladwa", "alrashidia", "alabadia",
        "alsaadoon", "aliskan", "aldahia", "aldana", "other"
      ),
      allowNull: true,
      comment: "جهة السكن بالطرف",
    },
    residenceAreaOther: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "جهة السكن — أخرى",
    },
    // --- الحالة السكنية ---
    buildingOwnership: {
      type: DataTypes.ENUM("private", "shared", "rented", "charity_house", "developmental_housing"),
      allowNull: true,
      comment: "ملكية البناء",
    },
    buildingType: {
      type: DataTypes.ENUM("arabic", "concrete", "other"),
      allowNull: true,
      comment: "نوع البناء",
    },
    buildingTypeOther: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "نوع البناء — أخرى",
    },
    buildingCondition: {
      type: DataTypes.ENUM("good", "average", "needs_repair"),
      allowNull: true,
      comment: "حالة البناء",
    },
    buildingCapacity: {
      type: DataTypes.ENUM("small", "medium", "sufficient"),
      allowNull: true,
      comment: "اتساع البناء",
    },
    // --- الزيارات الدينية (JSON) ---
    husbandReligious: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "الزيارات الدينية — الزوج: {hajj,umrah,prophetMosque}",
    },

    // --- الأثاث والأجهزة والممتلكات (JSON) ---
    furnitureAppliances: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "الأثاث والأجهزة — كل عنصر: {good,unavailable,needsRepair,needsReplacement,notes}",
    },
    // --- مصادر الدخل (JSON) ---
    incomeSources: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "مصادر الدخل — كل مصدر: {monthly,notes}",
    },
    // --- خصم الإيجار ---
    rentDeduction: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "خصم الإيجار — يُخصم من مجموع الدخل",
    },
    // --- الالتزامات المالية (JSON) ---
    financialObligations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "الالتزامات المالية — كل بند: {monthly,notes}",
    },
    // --- حقول عامة ---
    healthCondition: {
      type: DataTypes.ENUM("healthy", "unhealthy"),
      allowNull: true,
      comment: "الحالة الصحية — سليم / غير سليم",
    },
    healthStatus: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "الحالة الصحية (نصاً) — يظهر فقط عند اختيار غير سليم",
    },
    origin: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "الأصل",
    },
    researcherName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "اسم الباحث",
    },
    firstVisitDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "تاريخ الزيارة الأولى",
    },
    updateDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "تاريخ التحديث",
    },
    nextUpdate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "التحديث القادم",
    },
    familySkillsTalents: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "المهن والمواهب لأفراد العائلة",
    },
    researcherNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "ملاحظات وتوصيات وشروح الباحث",
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("draft", "pending_review", "returned", "approved"),
      allowNull: false,
      defaultValue: "draft",
      comment: "حالة الملف: مسودة / بانتظار المراجعة / مُعاد / مُعتمد",
    },
    returnNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "ملاحظة الإرجاع من لجنة المراجعة",
    },
    customFields: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "حقول مخصصة أضافها المدير — {fieldName: value}",
    },
  },
  {
    timestamps: true,
    hooks: {
      beforeValidate: (instance) => {
        // Convert empty strings to null for ENUM fields to prevent "Data truncated" errors
        const enumFields = [
          "gender", "maritalStatus", "residenceArea", "buildingOwnership",
          "buildingType", "buildingCondition", "buildingCapacity", "status",
          "healthCondition",
        ];
        for (const field of enumFields) {
          if (instance[field] === "") {
            instance[field] = null;
          }
        }
      },
    },
  }
);

module.exports = Beneficiary;
