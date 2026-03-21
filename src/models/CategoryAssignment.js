const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CategoryAssignment = sequelize.define(
  "CategoryAssignment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    beneficiaryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "المستفيد",
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "الفئة الجديدة",
    },
    previousCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "الفئة السابقة",
    },
    assignedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "المستخدم الذي عيّن الفئة",
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "سبب التعيين أو التغيير (إلزامي)",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = CategoryAssignment;
