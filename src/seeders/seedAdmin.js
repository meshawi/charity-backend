/**
 * SYSTEM SEEDER
 * Creates permissions, roles, users, field configs, categories, programs,
 * beneficiaries (core + 40 extra), dependents, disbursements.
 *
 * Run with:  node src/seeders/seedAdmin.js
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const {
  sequelize,
  Permission,
  Role,
  User,
  FieldConfig,
  Category,
  Program,
  Beneficiary,
  Dependent,
  Disbursement,
  CategoryAssignment,
  ProgramCategory,
} = require("../models");

// -- Data modules --
const permissionsData = require("./data/permissions");
const rolesData = require("./data/roles");
const { beneficiaryFields, dependentFields } = require("./data/fieldConfigs");
const usersData = require("./data/users");
const {
  categoriesData,
  programsData,
  buildCoreBeneficiaries,
  buildCoreDependents,
  buildCoreDisbursements,
} = require("./data/dummyData");
const { buildExtraBeneficiaries } = require("./data/extraBeneficiaries");

// ------------------------------------------------------------------
const seed = async () => {
  try {
    console.log("\n=== Starting system seeder ===\n");

    // Reset DB
    await sequelize.sync({ force: true });
    console.log("Database synced (force: true)");

    // 1. Permissions
    const createdPerms = await Permission.bulkCreate(permissionsData);
    const permMap = Object.fromEntries(createdPerms.map((p) => [p.name, p.id]));
    console.log(`Created ${createdPerms.length} permissions`);

    // 2. Roles + permission links
    const createdRoles = [];
    for (const r of rolesData) {
      const role = await Role.create({ name: r.name, description: r.description });
      const ids =
        r.permissions === "all"
          ? Object.values(permMap)
          : r.permissions.map((pn) => permMap[pn]);
      await role.addPermissions(ids);
      createdRoles.push(role);
    }
    const roleMap = Object.fromEntries(createdRoles.map((r) => [r.name, r]));
    console.log(`Created ${createdRoles.length} roles`);

    // 3. Users
    const createdUsers = [];
    for (const u of usersData) {
      const user = await User.create({
        email: u.email,
        password: u.password,
        name: u.name,
        nationalId: u.nationalId,
        isSuperAdmin: u.isSuperAdmin || false,
      });
      const role = roleMap[u.roleName];
      if (role) await user.addRole(role);
      createdUsers.push(user);
    }
    console.log(`Created ${createdUsers.length} users`);

    // 4. Field configs
    const allFieldConfigs = [
      ...beneficiaryFields.map((f) => ({ ...f, fieldGroup: "beneficiary" })),
      ...dependentFields.map((f) => ({ ...f, fieldGroup: "dependent" })),
    ];
    await FieldConfig.bulkCreate(allFieldConfigs);
    console.log(`Created ${allFieldConfigs.length} field configs`);

    // 5. Categories
    const createdCategories = await Category.bulkCreate(categoriesData);
    const catIds = createdCategories.map((c) => c.id);
    console.log(`Created ${createdCategories.length} categories`);

    // 6. Programs + category links
    const createdPrograms = [];
    for (const p of programsData) {
      const prog = await Program.create({
        name: p.name,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        isActive: p.isActive,
      });
      for (const ci of p.categoryIndices) {
        await ProgramCategory.create({
          programId: prog.id,
          categoryId: catIds[ci],
        });
      }
      createdPrograms.push(prog);
    }
    const progIds = createdPrograms.map((p) => p.id);
    console.log(`Created ${createdPrograms.length} programs`);

    // 7. Core beneficiaries (9)
    const userIds = createdUsers.map((u) => u.id);
    const coreBenData = buildCoreBeneficiaries(catIds, userIds);
    const createdCoreBen = await Beneficiary.bulkCreate(coreBenData);
    const coreBenIds = createdCoreBen.map((b) => b.id);
    console.log(`Created ${createdCoreBen.length} core beneficiaries`);

    // Category assignments for core
    const coreAssignments = createdCoreBen.map((b, i) => ({
      beneficiaryId: b.id,
      categoryId: coreBenData[i].categoryId,
      previousCategoryId: null,
      assignedById: coreBenData[i].createdById,
      note: "تعيين أولي عند إنشاء الملف",
      createdAt: coreBenData[i].createdAt,
      updatedAt: coreBenData[i].createdAt,
    }));
    await CategoryAssignment.bulkCreate(coreAssignments);

    // 8. Extra historical beneficiaries (40)
    const startSeq = coreBenIds.length + 1; // 10
    const creatorPool = [
      userIds[0], // admin
      userIds[1], // users mgr
      userIds[2], // researcher
      userIds[4], // reviewer
      userIds[5], // prog mgr
    ];
    const extraBenData = buildExtraBeneficiaries(catIds, creatorPool, startSeq);
    const extraCreated = await Beneficiary.bulkCreate(extraBenData);
    console.log(`Created ${extraCreated.length} additional historical beneficiaries`);

    const extraAssignments = extraCreated
      .map((b, i) => {
        if (!extraBenData[i].categoryId) return null;
        return {
          beneficiaryId: b.id,
          categoryId: extraBenData[i].categoryId,
          previousCategoryId: null,
          assignedById: extraBenData[i].createdById,
          note: "تعيين أولي عند إنشاء الملف",
          createdAt: extraBenData[i].createdAt,
          updatedAt: extraBenData[i].createdAt,
        };
      })
      .filter(Boolean);
    await CategoryAssignment.bulkCreate(extraAssignments);
    console.log(`Created ${coreAssignments.length + extraAssignments.length} category assignments`);

    // 9. Dependents
    const dependentsData = buildCoreDependents(coreBenIds);
    await Dependent.bulkCreate(dependentsData);
    console.log(`Created ${dependentsData.length} dependents`);

    // 10. Core disbursements
    const coreDisb = buildCoreDisbursements(coreBenIds, progIds, userIds);
    await Disbursement.bulkCreate(coreDisb);
    console.log(`Created ${coreDisb.length} core disbursements`);

    // 11. Extra historical disbursements
    const allProgIds = progIds;
    const distributors = [userIds[0], userIds[3]]; // admin + distributor
    const extraDisbursements = [];
    const cutoff = new Date("2026-03-21");
    const recentStart = new Date("2026-01-20");
    const noDisbursementIndices = new Set([34, 35]);
    const noDisbursementIds = new Set(
      [...noDisbursementIndices].map((idx) => extraCreated[idx].id)
    );

    // Phase 1: normal disbursements spread across the full range
    for (let i = 0; i < extraCreated.length; i++) {
      if (noDisbursementIndices.has(i)) continue;
      const bDate = extraBenData[i].createdAt;
      const count = 1 + (i % 3);
      for (let j = 0; j < count; j++) {
        const offsetDays = 14 + j * 45;
        const disbDate = new Date(bDate.getTime() + offsetDays * 86400000);
        if (disbDate > cutoff) continue;
        extraDisbursements.push({
          beneficiaryId: extraCreated[i].id,
          programId: allProgIds[(i + j) % allProgIds.length],
          disbursedById: distributors[j % distributors.length],
          disbursedAt: disbDate.toISOString().slice(0, 10),
          createdAt: disbDate,
          updatedAt: disbDate,
        });
      }
    }

    // Phase 2: dense recent disbursements (last 60 days)
    const recentMs = recentStart.getTime();
    const allBeneficiaries = [...createdCoreBen, ...extraCreated];
    const recentNotes = ["صرف دوري", "صرف شهري", "توزيع سلال", "دعم إيجار", "كسوة", ""];

    for (let d = 0; d < 60; d++) {
      const dayDate = new Date(recentMs + d * 86400000);
      if (dayDate > cutoff) break;
      const dateStr = dayDate.toISOString().slice(0, 10);
      const dayCount = (d * 7 + 3) % 6;
      for (let k = 0; k < dayCount; k++) {
        const bIdx = (d * 3 + k) % allBeneficiaries.length;
        if (noDisbursementIds.has(allBeneficiaries[bIdx].id)) continue;
        const pIdx = (d + k) % allProgIds.length;
        extraDisbursements.push({
          beneficiaryId: allBeneficiaries[bIdx].id,
          programId: allProgIds[pIdx],
          disbursedById: distributors[k % distributors.length],
          disbursedAt: dateStr,
          notes: recentNotes[(d + k) % recentNotes.length] || undefined,
          createdAt: dayDate,
          updatedAt: dayDate,
        });
      }
    }

    await Disbursement.bulkCreate(extraDisbursements);
    console.log(`Created ${extraDisbursements.length} additional historical disbursements`);

    // -- Summary --
    console.log("\n========================================");
    console.log("System seeder completed successfully!");
    console.log("========================================\n");
    console.log("Login credentials:");
    console.log("  Admin:         admin@charity.com / admin123");
    console.log("  Users Mgr:     users-mgr@charity.com / 123456");
    console.log("  Researcher:    researcher@charity.com / 123456");
    console.log("  Distributor:   distributor@charity.com / 123456");
    console.log("  Reviewer:      reviewer@charity.com / 123456");
    console.log("  Program Mgr:   prog-mgr@charity.com / 123456");
    console.log("  Reports Mgr:   reports@charity.com / 123456");
    console.log("\nTest beneficiary (#9 - محمد عبدالرحمن الحربي, NID: 1098765440):");
    console.log("  P1 (دعم شهري)   -> already received");
    console.log("  P2 (كسوة الشتاء) -> family dedup (dependent = beneficiary 3)");
    console.log("  P3 (سلة غذائية)  -> not qualified (cat أ not in [ب,د])");
    console.log("  P4 (إعانة إيجار) -> VALID, can receive");
    console.log("\nBuilding ownership samples:");
    console.log("  #2,#7 = charity_house | #3,#8 = developmental_housing");
    console.log("\nSpecial extra beneficiaries:");
    console.log("  30-33: No name | 34-35: Never received disbursement");
    console.log("  36-37: Draft   | 38-39: Pending review");
    console.log("\nNeed-update test data (nextUpdate within 30 days or past):");
    console.log("  Core: #1 overdue(-60d), #2(10d), #3(25d), #5 overdue(-15d), #6(today), #8(29d), #9(5d)");
    console.log("  Extra 0-4: overdue(-90...-50d)  |  Extra 5-9: within 30d (18-42d)");
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("\nSeeder error:", error);
    process.exit(1);
  }
};

seed();
