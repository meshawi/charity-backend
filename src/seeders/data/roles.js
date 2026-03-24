/**
 * System roles with their assigned permissions.
 * "all" = gets every permission.
 */
const roles = [
  {
    name: "مدير النظام",
    description: "صلاحيات كاملة على النظام",
    permissions: "all",
  },
  {
    name: "مدير المستخدمين",
    description: "إنشاء وتعديل وحذف المستخدمين وإدارة الأدوار",
    permissions: ["create_user", "view_users", "edit_user", "delete_user", "manage_roles"],
  },
  {
    name: "مدير البرامج",
    description: "إنشاء وتعديل وحذف البرامج وإدارة الفئات",
    permissions: ["manage_programs", "manage_categories"],
  },
  {
    name: "باحث",
    description: "إنشاء وتعديل بيانات المستفيدين والتابعين",
    permissions: ["create_profile", "view_profiles", "edit_profile", "manage_field_config"],
  },
  {
    name: "لجنة المراجعة",
    description: "عرض بيانات المستفيدين وتعيين/تغيير الفئة فقط",
    permissions: ["view_profiles", "assign_category"],
  },
  {
    name: "موزع",
    description: "توزيع البرامج للمستفيدين فقط",
    permissions: ["process_disbursement"],
  },
  {
    name: "مدير التقارير",
    description: "عرض سجل التوزيعات والتقارير",
    permissions: ["view_disbursements", "view_reports", "view_profiles"],
  },
];

module.exports = roles;
