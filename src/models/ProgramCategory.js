const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProgramCategory = sequelize.define('ProgramCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
  // Removed indexes for offline system performance
});

module.exports = ProgramCategory;
