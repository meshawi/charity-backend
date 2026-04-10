const fs = require("fs");
const path = require("path");
const { PDF_PATH } = require("../config/storage");
const {
  getLogoBase64,
  formatDateArabic,
  formatTimeArabic,
  renderPdf,
} = require("./pdfShared");

// Use centralized PDF storage path
const ACKNOWLEDGMENTS_DIR = PDF_PATH;

// Ensure acknowledgments directory exists
if (!fs.existsSync(ACKNOWLEDGMENTS_DIR)) {
  fs.mkdirSync(ACKNOWLEDGMENTS_DIR, { recursive: true });
}

// Generate HTML template for acknowledgment PDF
const generateAcknowledgmentHtml = ({
  disbursement,
  caseData: profileData,
  program,
  disbursedBy,
  signatureData = null,
}) => {
  const logoBase64 = getLogoBase64();
  const fullName = profileData.name || "";

  const startDateStr = program.startDate
    ? formatDateArabic(program.startDate)
    : "غير محدد";
  const endDateStr = program.endDate
    ? formatDateArabic(program.endDate)
    : "مستمر";

  const disbursedAtDate = formatDateArabic(disbursement.disbursedAt);
  const disbursedAtTime = formatTimeArabic(disbursement.disbursedAt);

  const receiverText = disbursement.receiverName
    ? `${disbursement.receiverName} (نيابة عن المستفيد)`
    : "المستفيد (صاحب الملف)";

  // Employee info with national ID
  const employeeInfo = disbursedBy.nationalId
    ? `${disbursedBy.name} (${disbursedBy.nationalId})`
    : disbursedBy.name;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إقرار استلام</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Arabic', 'Arial', sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #333;
      background: #fff;
      direction: rtl;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 12mm 18mm 15mm;
      margin: 0 auto;
      position: relative;
    }
    .page::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 5px;
      background: linear-gradient(90deg, #1a5f7a, #159895, #57c5b6);
    }
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #ddd;
      margin-bottom: 10px;
    }
    .main-title {
      font-size: 18pt;
      font-weight: 700;
      color: #1a5f7a;
      margin: 0;
    }
    .logo {
      width: 100px;
      height: auto;
      border: none;
    }
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    table th, table td {
      border: 1px solid #ccc;
      padding: 5px 8px;
      text-align: right;
      font-size: 9pt;
    }
    table th {
      background: #1a5f7a;
      color: #fff;
      font-weight: 600;
      font-size: 9pt;
    }
    .lbl { color: #666; font-weight: 400; width: 18%; }
    .val { font-weight: 600; color: #222; }
    .val.hi { color: #1a5f7a; }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #1a5f7a;
      margin: 10px 0 4px;
    }
    /* Declaration */
    .declaration {
      background: #fffde7;
      border: 1px solid #e0c600;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 10px 0;
    }
    .declaration h3 {
      font-size: 10pt;
      font-weight: 700;
      color: #856404;
      margin-bottom: 4px;
    }
    .declaration p {
      font-size: 8.5pt;
      line-height: 1.7;
      color: #664d03;
      text-align: justify;
    }
    /* Bottom row */
    .bottom-row {
      display: flex;
      gap: 15px;
      margin-top: 10px;
      align-items: flex-start;
    }
    .sig-box {
      flex: 1;
      text-align: center;
    }
    .sig-area {
      border: 2px solid #1a5f7a;
      border-radius: 8px;
      min-height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      padding: 8px;
      margin-bottom: 4px;
    }
    .sig-area img { max-width: 160px; max-height: 60px; }
    .sig-label {
      font-size: 8.5pt;
      font-weight: 600;
      color: #1a5f7a;
      border-top: 1.5px solid #1a5f7a;
      padding-top: 4px;
    }
    .no-sig { color: #aaa; font-size: 8pt; font-style: italic; }
    .date-box {
      text-align: center;
      background: #f5f5f5;
      padding: 8px 14px;
      border-radius: 6px;
      border: 1.5px solid #1a5f7a;
      font-size: 8.5pt;
      color: #555;
    }
    .date-box div { margin: 2px 0; }
    .footer {
      position: absolute;
      bottom: 8mm;
      left: 18mm; right: 18mm;
      text-align: center;
      font-size: 7.5pt;
      color: #bbb;
      border-top: 1px solid #eee;
      padding-top: 6px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { margin: 0; padding: 10mm 15mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1 class="main-title">نموذج المستفيد (إقرار واستلام)</h1>
      ${logoBase64 ? `<img src="${logoBase64}" alt="الشعار" class="logo">` : ""}
    </div>

    <!-- Program & Beneficiary Info -->
    <table>
      <tr>
        <th colspan="6">معلومات البرنامج والمستفيد</th>
      </tr>
      <tr>
        <td class="lbl">اسم البرنامج</td>
        <td class="val hi">${program.name}</td>
        <td class="lbl">فترة البرنامج</td>
        <td class="val" colspan="3">${startDateStr} - ${endDateStr}</td>
      </tr>
      <tr>
        <td class="lbl">الاسم الكامل</td>
        <td class="val">${fullName}</td>
        <td class="lbl">رقم الهوية</td>
        <td class="val">${profileData.nationalId}</td>
        <td class="lbl">رقم الجوال</td>
        <td class="val">${profileData.phone || ""}</td>
      </tr>
    </table>

    <!-- Disbursement Details -->
    <table>
      <tr>
        <th colspan="4">تفاصيل الصرف</th>
      </tr>
      <tr>
        <td class="lbl">تمت المعالجة بواسطة</td>
        <td class="val">${employeeInfo}</td>
        <td class="lbl">تم الاستلام بواسطة</td>
        <td class="val">${receiverText}</td>
      </tr>
      ${disbursement.notes ? `
      <tr>
        <td class="lbl">ملاحظات</td>
        <td class="val" colspan="3">${disbursement.notes}</td>
      </tr>` : ""}
    </table>

    <!-- Declaration -->
    <div class="declaration">
      <h3>⚠ إقرار وتعهد</h3>
      <p>أقرّ أنا الموقّع أدناه أو من ينوب عني في الاستلام بأنني قد استلمت المساعدات المقدمة من الجمعية، وبعد الاطلاع على شروطها وضوابطها، وأتعهد بالالتزام بجميع التعليمات، واستخدامها فيما خُصصت له بما يعود بالنفع لي ولعائلتي فقط، وعدم التصرف بها أو استغلالها أو بيعها بأي شكل يخالف تعليمات الجمعية. كما أتحمل كامل المسؤولية النظامية والقانونية المترتبة على أي مخالفة، وأقرّ بصحة هذا التعهد والعمل بموجبه اعتبارًا من تاريخ التوقيع.</p>
    </div>

    <!-- Signature & Date -->
    <div class="bottom-row">
      <div class="sig-box">
        <div class="sig-area">
          ${signatureData
            ? `<img src="${signatureData}" alt="التوقيع">`
            : `<span class="no-sig">لا يوجد توقيع</span>`}
        </div>
        <div class="sig-label">توقيع المستفيد / المستلم</div>
      </div>
      <div class="date-box">
        <div><strong>التاريخ:</strong> ${disbursedAtDate}</div>
        <div><strong>الوقت:</strong> ${disbursedAtTime}</div>
      </div>
    </div>

    <div class="footer">هذا المستند تم إنشاؤه إلكترونياً ولا يحتاج إلى ختم</div>
  </div>
</body>
</html>
`;
};

/**
 * Generate acknowledgment PDF for a disbursement
 */
const generateAcknowledgmentPdf = async ({
  disbursement,
  caseData: profileData,
  program,
  disbursedBy,
  signatureData = null,
}) => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const subDir = path.join(ACKNOWLEDGMENTS_DIR, yearMonth);

  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }

  const fileName = `acknowledgment_${disbursement.id}_${Date.now()}.pdf`;
  const relativePath = `${yearMonth}/${fileName}`;
  const filePath = path.join(subDir, fileName);

  const html = generateAcknowledgmentHtml({
    disbursement,
    caseData: profileData,
    program,
    disbursedBy,
    signatureData,
  });

  await renderPdf(html, filePath);
  return relativePath;
};

/**
 * Stream PDF on-the-fly for legacy records (no saved file)
 */
const streamAcknowledgmentPdf = async (
  { disbursement, caseData: profileData, program, disbursedBy },
  res
) => {
  const html = generateAcknowledgmentHtml({
    disbursement,
    caseData: profileData,
    program,
    disbursedBy,
    signatureData: null,
  });

  const pdfBuffer = await renderPdf(html);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="acknowledgment_${disbursement.id}.pdf"`
  );
  res.send(pdfBuffer);
};

const getAcknowledgmentsDir = () => ACKNOWLEDGMENTS_DIR;

const getFullPdfPath = (relativePath) => {
  if (!relativePath) return null;
  return path.join(ACKNOWLEDGMENTS_DIR, relativePath);
};

module.exports = {
  generateAcknowledgmentPdf,
  streamAcknowledgmentPdf,
  getAcknowledgmentsDir,
  getFullPdfPath,
  ACKNOWLEDGMENTS_DIR,
};