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
      unique: true,
      comment: "One pledge per beneficiary",
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
  }
);

module.exports = Pledge;
