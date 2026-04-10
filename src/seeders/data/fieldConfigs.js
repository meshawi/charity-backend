/**
 * Field configuration definitions for beneficiaries and dependents.
 * Controls which fields can be made mandatory via the admin UI.
 *
 * System (isCustom: false) fields are seeded here.
 * Custom fields are created at runtime by the admin.
 */
const beneficiaryFields = [
  { fieldName: "nationalId", fieldLabel: "رقم الهوية", isRequired: true },
  { fieldName: "name", fieldLabel: "الإسم" },
  { fieldName: "gender", fieldLabel: "النوع" },
  { fieldName: "dateOfBirth", fieldLabel: "تاريخ الميلاد" },
  { fieldName: "maritalStatus", fieldLabel: "الحالة الاجتماعية" },
  { fieldName: "phone", fieldLabel: "رقم الجوال" },
  { fieldName: "otherPhone", fieldLabel: "جوال آخر" },
  { fieldName: "otherPhoneRelationship", fieldLabel: "صلة صاحب الجوال الآخر" },
  { fieldName: "familyCount", fieldLabel: "عدد الأسرة" },
  { fieldName: "dependentsCount", fieldLabel: "عدد التابعين" },
  { fieldName: "iban", fieldLabel: "رقم الآيبان" },
  { fieldName: "bank", fieldLabel: "البنك" },
  { fieldName: "residenceArea", fieldLabel: "جهة السكن بالطرف" },
  { fieldName: "buildingOwnership", fieldLabel: "ملكية البناء" },
  { fieldName: "buildingType", fieldLabel: "نوع البناء" },
  { fieldName: "buildingCondition", fieldLabel: "حالة البناء" },
  { fieldName: "buildingCapacity", fieldLabel: "اتساع البناء" },
  { fieldName: "husbandReligious", fieldLabel: "الزيارات الدينية (الزوج)" },
  { fieldName: "furnitureAppliances", fieldLabel: "الأثاث والأجهزة والممتلكات" },
  { fieldName: "incomeSources", fieldLabel: "مصادر الدخل" },
  { fieldName: "rentDeduction", fieldLabel: "خصم الإيجار" },
  { fieldName: "financialObligations", fieldLabel: "الالتزامات المالية" },
  { fieldName: "healthCondition", fieldLabel: "الحالة الصحية" },
  { fieldName: "healthStatus", fieldLabel: "الحالة الصحية (نصاً)" },
  { fieldName: "origin", fieldLabel: "الأصل" },
  { fieldName: "researcherName", fieldLabel: "اسم الباحث" },
  { fieldName: "firstVisitDate", fieldLabel: "تاريخ الزيارة الأولى" },
  { fieldName: "updateDate", fieldLabel: "تاريخ التحديث" },
  { fieldName: "nextUpdate", fieldLabel: "التحديث القادم" },
  { fieldName: "familySkillsTalents", fieldLabel: "المهن والمواهب لأفراد العائلة" },
  { fieldName: "researcherNotes", fieldLabel: "ملاحظات وتوصيات الباحث" },
];

const dependentFields = [
  { fieldName: "name", fieldLabel: "الإسم" },
  { fieldName: "nationalId", fieldLabel: "رقم الهوية" },
  { fieldName: "gender", fieldLabel: "النوع" },
  { fieldName: "dateOfBirth", fieldLabel: "تاريخ الميلاد" },
  { fieldName: "relationship", fieldLabel: "صلة القرابة" },
  { fieldName: "dependentMaritalStatus", fieldLabel: "الحالة الاجتماعية" },
  { fieldName: "schoolName", fieldLabel: "اسم المدرسة" },
  { fieldName: "schoolGrade", fieldLabel: "الصف الدراسي" },
  { fieldName: "schoolType", fieldLabel: "نوع المدرسة" },
  { fieldName: "academicGrade", fieldLabel: "التقدير الدراسي" },
  { fieldName: "weaknessSubjects", fieldLabel: "مواد الضعف" },
  { fieldName: "educationStatus", fieldLabel: "الحالة التعليمية" },
  { fieldName: "healthCondition", fieldLabel: "الحالة الصحية" },
  { fieldName: "healthStatus", fieldLabel: "الحالة الصحية (نصاً)" },
  { fieldName: "religious", fieldLabel: "الزيارات الدينية (التابع)" },
  { fieldName: "notes", fieldLabel: "ملاحظات" },
];

// Each system field gets isCustom=false, fieldType="text", isActive=true
const addDefaults = (field) => ({
  ...field,
  isCustom: false,
  fieldType: "text",
  isActive: true,
  isRequired: field.isRequired || false,
});

// ── Custom fields (admin-created at runtime, seeded here for demo) ──

const customBeneficiaryFields = [
  {
    fieldName: "bloodType",
    fieldLabel: "فصيلة الدم",
    fieldGroup: "beneficiary",
    isCustom: true,
    fieldType: "select",
    options: ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
    isActive: true,
    isRequired: false,
  },
  {
    fieldName: "chronicDisease",
    fieldLabel: "مرض مزمن",
    fieldGroup: "beneficiary",
    isCustom: true,
    fieldType: "boolean",
    options: null,
    isActive: true,
    isRequired: false,
  },
  {
    fieldName: "employerName",
    fieldLabel: "جهة العمل",
    fieldGroup: "beneficiary",
    isCustom: true,
    fieldType: "text",
    options: null,
    isActive: true,
    isRequired: false,
  },
  {
    fieldName: "monthlyRent",
    fieldLabel: "قيمة الإيجار الشهري",
    fieldGroup: "beneficiary",
    isCustom: true,
    fieldType: "number",
    options: null,
    isActive: true,
    isRequired: false,
  },
  {
    fieldName: "leaseEndDate",
    fieldLabel: "تاريخ انتهاء عقد الإيجار",
    fieldGroup: "beneficiary",
    isCustom: true,
    fieldType: "date",
    options: null,
    isActive: false,
    isRequired: false,
  },
];

const customDependentFields = [
  {
    fieldName: "specialNeeds",
    fieldLabel: "احتياجات خاصة",
    fieldGroup: "dependent",
    isCustom: true,
    fieldType: "boolean",
    options: null,
    isActive: true,
    isRequired: false,
  },
  {
    fieldName: "tutoringSubject",
    fieldLabel: "مادة التقوية",
    fieldGroup: "dependent",
    isCustom: true,
    fieldType: "text",
    options: null,
    isActive: true,
    isRequired: false,
  },
];

module.exports = {
  beneficiaryFields: beneficiaryFields.map(addDefaults),
  dependentFields: dependentFields.map(addDefaults),
  customBeneficiaryFields,
  customDependentFields,
};
