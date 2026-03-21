const sequelize = require("../config/database");
const User = require("./User");
const Role = require("./Role");
const Permission = require("./Permission");
const RolePermission = require("./RolePermission");
const UserRole = require("./UserRole");
const AuditLog = require("./AuditLog");
const Category = require("./Category");
const Program = require("./Program");
const ProgramCategory = require("./ProgramCategory");
const Beneficiary = require("./Beneficiary");
const Dependent = require("./Dependent");
const Document = require("./Document");
const Disbursement = require("./Disbursement");
const FieldConfig = require("./FieldConfig");
const CategoryAssignment = require("./CategoryAssignment");

// Role - Permission (Many-to-Many)
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: "roleId" });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: "permissionId" });

// User - Role (Many-to-Many)
User.belongsToMany(Role, { through: UserRole, foreignKey: "userId" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "roleId" });

// Beneficiary - User (Creator)
Beneficiary.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });
User.hasMany(Beneficiary, { foreignKey: "createdById", as: "beneficiaries" });

// Beneficiary - Category
Beneficiary.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
Category.hasMany(Beneficiary, { foreignKey: "categoryId", as: "beneficiaries" });

// Beneficiary - Dependent (One-to-Many)
Beneficiary.hasMany(Dependent, { foreignKey: "beneficiaryId", as: "dependents", onDelete: "CASCADE" });
Dependent.belongsTo(Beneficiary, { foreignKey: "beneficiaryId", as: "beneficiary" });

// Beneficiary - Document (One-to-Many)
Beneficiary.hasMany(Document, { foreignKey: "beneficiaryId", as: "documents", onDelete: "CASCADE" });
Document.belongsTo(Beneficiary, { foreignKey: "beneficiaryId", as: "beneficiary" });
Document.belongsTo(User, { foreignKey: "uploadedById", as: "uploadedBy" });

// Category - Program (Many-to-Many)
Category.belongsToMany(Program, { through: ProgramCategory, foreignKey: "categoryId", as: "programs" });
Program.belongsToMany(Category, { through: ProgramCategory, foreignKey: "programId", as: "categories" });

// Disbursement associations
Disbursement.belongsTo(Beneficiary, { foreignKey: "beneficiaryId", as: "beneficiary" });
Disbursement.belongsTo(Program, { foreignKey: "programId", as: "program" });
Disbursement.belongsTo(User, { foreignKey: "disbursedById", as: "disbursedBy" });
Beneficiary.hasMany(Disbursement, { foreignKey: "beneficiaryId", as: "disbursements" });
Program.hasMany(Disbursement, { foreignKey: "programId", as: "disbursements" });

// CategoryAssignment associations
CategoryAssignment.belongsTo(Beneficiary, { foreignKey: "beneficiaryId", as: "beneficiary" });
CategoryAssignment.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
CategoryAssignment.belongsTo(Category, { foreignKey: "previousCategoryId", as: "previousCategory" });
CategoryAssignment.belongsTo(User, { foreignKey: "assignedById", as: "assignedBy" });
Beneficiary.hasMany(CategoryAssignment, { foreignKey: "beneficiaryId", as: "categoryHistory" });

module.exports = {
  sequelize,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  AuditLog,
  Category,
  Program,
  ProgramCategory,
  Beneficiary,
  Dependent,
  Document,
  Disbursement,
  FieldConfig,
  CategoryAssignment,
};
