// The seeded admin role name — immutable, must match the seeder
const SUPER_ADMIN_ROLE = "مدير النظام";

// Free-form document type: needs a title, and a file can hold many of them
const OTHER_DOCUMENT_TYPE = "other";

// Fixed document types — one document per type per beneficiary (except "other")
const DOCUMENT_TYPES = [
  { key: "association_research", label: "بحث الجمعيات" },
  { key: "national_id", label: "الهوية الوطنية" },
  { key: "family_card", label: "كرت العائلة" },
  { key: "residence_proof", label: "إثبات سكن" },
  { key: "absher_data", label: "بيانات أبشر" },
  { key: "support_deed", label: "صك إعالة" },
  { key: "social_security_statement", label: "مشهد من الضمان (موضح فيه التابعين مبلغ الدعم)" },
  { key: "citizen_account_page", label: "صفحة حساب المواطن (موضح مبلغ الدعم)" },
  { key: "alimony_deed", label: "صك نفقة" },
  { key: "divorce_deed", label: "صك طلاق" },
  { key: "rehabilitation_statement", label: "مشهد من التأهيل الشامل" },
  { key: "monthly_income_cert", label: "تعريف بالدخل الشهري (التأمينات)" },
  { key: "medical_report", label: "تقرير طبي" },
  { key: OTHER_DOCUMENT_TYPE, label: "أخرى" },
];

module.exports = { SUPER_ADMIN_ROLE, DOCUMENT_TYPES, OTHER_DOCUMENT_TYPE };
