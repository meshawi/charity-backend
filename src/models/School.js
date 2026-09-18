const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Managed list of school names offered when filling in a dependent.
// Dependents store the school *name* (Dependent.schoolName), so removing a
// school from this list never erases anything from a dependent's file.
const School = sequelize.define(
  "School",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      comment: "اسم المدرسة",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = School;
