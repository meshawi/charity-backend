const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Disbursement = sequelize.define(
  "Disbursement",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    beneficiaryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    disbursedById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Employee who processed the disbursement",
    },
    receiverName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "If someone other than profile owner receives",
    },
    acknowledgmentFile: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Full PDF acknowledgment file name with signature embedded",
    },
    disbursedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    // Removed indexes for offline system performance
  }
);

module.exports = Disbursement;
