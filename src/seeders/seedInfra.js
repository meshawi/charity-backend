/**
 * INFRASTRUCTURE SEEDER
 * Creates the minimal infrastructure needed for production:
 * permissions, roles, system field configs, categories, and the super admin.
 *
 * Run with:  npm run infra-seed
 */

require("dotenv").config();
const {
  sequelize,
  Permission,
  Role,
  User,
  FieldConfig,
  Category,
} = require("../models");

// -- Data modules --
const permissionsData = require("./data/permissions");
const { SUPER_ADMIN_ROLE } = require("../utils/constants");
const { beneficiaryFields, dependentFields } = require("./data/fieldConfigs");
const categoriesData = require("./data/categories");

// ------------------------------------------------------------------
const seed = async () => {
  try {
    console.log("\n=== Starting infrastructure seeder ===\n");

    // Reset DB
    await sequelize.sync({ force: true });
    console.log("Database synced (force: true)");

    // 1. Permissions
    const createdPerms = await Permission.bulkCreate(permissionsData);
    const permMap = Object.fromEntries(createdPerms.map((p) => [p.name, p.id]));
    console.log(`Created ${createdPerms.length} permissions`);

    // 2. System admin role (only role seeded in infra)
    const adminRole = await Role.create({
      name: SUPER_ADMIN_ROLE,
      description: "صلاحيات كاملة على النظام",
    });
    await adminRole.addPermissions(Object.values(permMap));
    console.log(`Created system admin role: ${SUPER_ADMIN_ROLE}`);

    // 3. System field configs (no custom fields)
    const systemFieldConfigs = [
      ...beneficiaryFields.map((f) => ({ ...f, fieldGroup: "beneficiary" })),
      ...dependentFields.map((f) => ({ ...f, fieldGroup: "dependent" })),
    ];
    await FieldConfig.bulkCreate(systemFieldConfigs);
    console.log(`Created ${systemFieldConfigs.length} system field configs`);

    // 4. Categories
    await Category.bulkCreate(categoriesData);
    console.log(`Created ${categoriesData.length} categories`);

    // 5. Super Admin from ENV
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminName = process.env.SUPER_ADMIN_NAME;
    const adminNationalId = process.env.SUPER_ADMIN_NATIONAL_ID;
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!adminEmail || !adminName || !adminNationalId || !adminPassword) {
      console.error("\n✗ Super admin ENV vars are required.");
      console.error("  Set: SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, SUPER_ADMIN_NATIONAL_ID, SUPER_ADMIN_PASSWORD\n");
      process.exit(1);
    }

    const admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      nationalId: adminNationalId,
      isSuperAdmin: true,
    });
    await admin.addRole(adminRole);
    console.log(`Created super admin: ${adminEmail}`);

    // -- Summary --
    console.log("\n========================================");
    console.log("Infrastructure seeder completed!");
    console.log("========================================\n");
    console.log(`Super admin login: ${adminEmail} / (password from ENV)`);
    console.log(`National ID: ${adminNationalId}`);
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("\nSeeder error:", error);
    process.exit(1);
  }
};

seed();
