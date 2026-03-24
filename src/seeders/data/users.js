/**
 * Users seeded for development / demo.
 * Each entry: { email, password, name, nationalId, isSuperAdmin?, roleName }
 */
const users = [
  {
    email: "admin@charity.com",
    password: "admin123",
    name: "مدير النظام",
    nationalId: "1234567890",
    isSuperAdmin: true,
    roleName: "مدير النظام",
  },
  {
    email: "users-mgr@charity.com",
    password: "123456",
    name: "خالد مدير المستخدمين",
    nationalId: "1111111111",
    roleName: "مدير المستخدمين",
  },
  {
    email: "researcher@charity.com",
    password: "123456",
    name: "سارة الباحثة",
    nationalId: "2222222222",
    roleName: "باحث",
  },
  {
    email: "distributor@charity.com",
    password: "123456",
    name: "محمد الموزع",
    nationalId: "3333333333",
    roleName: "موزع",
  },
  {
    email: "reviewer@charity.com",
    password: "123456",
    name: "نورة لجنة المراجعة",
    nationalId: "4444444444",
    roleName: "لجنة المراجعة",
  },
  {
    email: "prog-mgr@charity.com",
    password: "123456",
    name: "أحمد مدير البرامج",
    nationalId: "5555555555",
    roleName: "مدير البرامج",
  },
  {
    email: "reports@charity.com",
    password: "123456",
    name: "فهد مدير التقارير",
    nationalId: "6666666666",
    roleName: "مدير التقارير",
  },
];

module.exports = users;
