const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Dependent = sequelize.define(
  "Dependent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    beneficiaryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "المستفيد الأساسي",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "الإسم",
    },
    nationalId: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "رقم الهوية",
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
    relationship: {
      type: DataTypes.ENUM("son", "daughter", "wife", "other"),
      allowNull: true,
      comment: "صلة القرابة",
    },
    relationshipOther: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "صلة القرابة — أخرى",
    },
    dependentMaritalStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "الحالة الاجتماعية",
    },
    schoolName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "اسم المدرسة",
    },
    schoolGrade: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "الصف الدراسي",
    },
    schoolType: {
      type: DataTypes.ENUM("public", "private", "other"),
      allowNull: true,
      comment: "نوع المدرسة",
    },
    schoolTypeOther: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "نوع المدرسة — أخرى",
    },
    academicGrade: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "التقدير الدراسي",
    },
    weaknessSubjects: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "مواد الضعف",
    },
    educationStatus: {
      type: DataTypes.ENUM("enrolled", "graduated", "dropped_out", "not_enrolled"),
      allowNull: true,
      comment: "الحالة التعليمية",
    },
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
    religious: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "الزيارات الدينية — التابع: {hajj,umrah,prophetMosque}",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "ملاحظات",
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
        const enumFields = ["gender", "relationship", "schoolType", "educationStatus", "healthCondition"];
        for (const field of enumFields) {
          if (instance[field] === "") {
            instance[field] = null;
          }
        }
      },
    },
  }
);

module.exports = Dependent;
