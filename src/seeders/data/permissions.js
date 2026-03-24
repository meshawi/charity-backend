/**
 * System permissions — matches what the app expects.
 */
const permissions = [
  { name: "create_user", label: "إنشاء مستخدم", description: "إنشاء حسابات مستخدمين جديدة في النظام" },
  { name: "view_users", label: "عرض المستخدمين", description: "عرض قائمة المستخدمين وبياناتهم" },
  { name: "edit_user", label: "تعديل مستخدم", description: "تعديل بيانات المستخدمين وإعادة تعيين كلمات المرور" },
  { name: "delete_user", label: "حذف مستخدم", description: "حذف حسابات المستخدمين من النظام" },
  { name: "manage_roles", label: "إدارة الأدوار", description: "عرض الأدوار والصلاحيات المتاحة" },
  { name: "create_profile", label: "إنشاء ملف", description: "إنشاء ملفات مستفيدين جديدة" },
  { name: "view_profiles", label: "عرض الملفات", description: "عرض بيانات المستفيدين والتابعين والمستندات" },
  { name: "edit_profile", label: "تعديل ملف", description: "تعديل بيانات المستفيدين والتابعين" },
  { name: "delete_profile", label: "حذف ملف", description: "حذف ملفات المستفيدين من النظام" },
  { name: "manage_categories", label: "إدارة الفئات", description: "تعديل أوصاف الفئات" },
  { name: "manage_programs", label: "إدارة البرامج", description: "إنشاء وتعديل وحذف البرامج وربطها بالفئات" },
  { name: "process_disbursement", label: "معالجة الصرف", description: "توزيع البرامج للمستفيدين وإصدار إقرارات الاستلام" },
  { name: "view_disbursements", label: "عرض المدفوعات", description: "عرض سجل التوزيعات وتفاصيلها" },
  { name: "manage_field_config", label: "إدارة إعدادات الحقول", description: "التحكم بالحقول المطلوبة عند إنشاء المستفيدين" },
  { name: "assign_category", label: "تعيين الفئة", description: "تعيين أو تغيير فئة المستفيد" },
  { name: "view_reports", label: "عرض التقارير", description: "عرض وتصدير التقارير بصيغة Excel" },
  { name: "view_dashboard", label: "عرض لوحة المعلومات", description: "عرض إحصائيات ورسوم بيانية لوحة المعلومات" },
];

module.exports = permissions;
