const { DataTypes } = require("sequelize");
const logger = require("./logger");

/**
 * Columns added after the first release.
 *
 * `sequelize.sync()` creates missing tables but never alters existing ones,
 * so a database installed from an older version would be missing these.
 * Each entry is added only if absent — safe to run on every start, and it
 * never changes or removes anything. Keep in step with the model definitions.
 */
const ADDED_COLUMNS = [
  { model: "Document", column: "title", definition: { type: DataTypes.STRING, allowNull: true } },
  { model: "Document", column: "notes", definition: { type: DataTypes.TEXT, allowNull: true } },
];

const applySchemaUpdates = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const described = new Map();

  for (const { model, column, definition } of ADDED_COLUMNS) {
    const table = sequelize.model(model).getTableName();
    if (!described.has(table)) described.set(table, await queryInterface.describeTable(table));

    if (!described.get(table)[column]) {
      await queryInterface.addColumn(table, column, definition);
      logger.info(`Schema update: added column ${table}.${column}`);
    }
  }
};

module.exports = { applySchemaUpdates };
