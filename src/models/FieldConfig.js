const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const FieldConfig = sequelize.define(
  "FieldConfig",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fieldName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "اسم الحقل في الكود",
    },
    fieldLabel: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "اسم الحقل بالعربي",
    },
    fieldGroup: {
      type: DataTypes.ENUM("beneficiary", "dependent"),
      allowNull: false,
      defaultValue: "beneficiary",
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isCustom: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "حقل مخصص أضافه المدير",
    },
    fieldType: {
      type: DataTypes.ENUM("text", "number", "date", "select", "boolean"),
      allowNull: false,
      defaultValue: "text",
      comment: "نوع الحقل المخصص",
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "خيارات الاختيار — مصفوفة نصوص (لحقول select فقط)",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "مفعّل / معطّل — الحذف الناعم",
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["fieldName", "fieldGroup"],
      },
    ],
  }
);

module.exports = FieldConfig;
