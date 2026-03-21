const { Op } = require("sequelize");

/**
 * Deactivate programs that have passed their end date
 */
const deactivateExpiredPrograms = async (Program) => {
  const today = new Date().toISOString().split("T")[0];

  const result = await Program.update(
    { isActive: false },
    {
      where: {
        endDate: { [Op.lt]: today },
        isActive: true,
      },
    }
  );

  if (result[0] > 0) {
    console.log(`Deactivated ${result[0]} expired programs`);
  }

  return result[0];
};

module.exports = { deactivateExpiredPrograms };
