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
