const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Program = sequelize.define(
  "Program",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    hooks: {
      // Auto-deactivate if end date has passed
      beforeFind: async (options) => {
        // This runs before each find query - deactivate expired programs
        const today = new Date().toISOString().split("T")[0];
        await sequelize.models.Program.update(
          { isActive: false },
          {
            where: {
              endDate: { [DataTypes.Op || require("sequelize").Op.lt]: today },
              isActive: true,
            },
            hooks: false, // Prevent infinite loop
          }
        );
      },
    },
  }
);

module.exports = Program;
