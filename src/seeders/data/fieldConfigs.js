/**
 * Field configuration definitions for beneficiaries and dependents.
 * Controls which fields can be made mandatory via the admin UI.
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

module.exports = { beneficiaryFields, dependentFields };
