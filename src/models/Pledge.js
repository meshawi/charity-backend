const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Pledge = sequelize.define(
  "Pledge",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    beneficiaryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "One pledge per beneficiary per year",
    },
    pledgeYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "The year this pledge covers (e.g. 2026)",
    },
    processedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Employee who processed the pledge",
    },
    pledgeText: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "The acknowledgment/pledge text that was displayed",
    },
    pdfFile: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Relative path to the generated PDF",
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["beneficiaryId", "pledgeYear"],
        name: "unique_beneficiary_year",
      },
    ],
  }
);

module.exports = Pledge;
