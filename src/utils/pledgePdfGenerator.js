const fs = require("fs");
const path = require("path");
const { PLEDGES_PATH } = require("../config/storage");
const {
  getLogoBase64,
  formatDateArabic,
  formatTimeArabic,
  renderPdf,
  BASE_CSS,
} = require("./pdfShared");

// Ensure pledges directory exists
if (!fs.existsSync(PLEDGES_PATH)) {
  fs.mkdirSync(PLEDGES_PATH, { recursive: true });
}

// Generate HTML template for pledge PDF
const generatePledgeHtml = ({
  beneficiary,
  pledgeText,
  signatureData,
  processedBy,
  signedAt,
  pledgeYear,
}) => {
  const logoBase64 = getLogoBase64();
  const dateStr = formatDateArabic(signedAt);
  const timeStr = formatTimeArabic(signedAt);

  const employeeInfo = processedBy.nationalId
    ? `${processedBy.name} (${processedBy.nationalId})`
    : processedBy.name;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إقرار وتعهد</title>
  <style>
    ${BASE_CSS}

    /* Pledge-specific styles */
    .pledge-card {
      margin: 25px 0;
      background: linear-gradient(135deg, #fff9e6, #fff3cd);
      border: 2px solid #ffc107;
      border-radius: 12px;
      padding: 25px 30px;
    }

    .pledge-title {
      font-size: 16pt;
      font-weight: 700;
      color: #856404;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pledge-title::before {
      content: '⚠';
      font-size: 20pt;
    }

    .pledge-text {
      font-size: 12pt;
      line-height: 2.2;
      color: #664d03;
      text-align: justify;
    }

    .signature-section {
      margin-top: 25px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      align-items: stretch;
    }

    .signature-box {
      text-align: center;
      display: flex;
      flex-direction: column;
    }

    .signature-box .signature-area {
      flex: 1;
      min-height: 90px;
    }

    .signature-area img {
      max-width: 220px;
      max-height: 100px;
    }

    .date-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 90px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-right">
        <h1 class="main-title">إقرار وتعهد - ${pledgeYear}</h1>
      </div>
      <div class="header-left">
        ${logoBase64 ? `<img src="${logoBase64}" alt="الشعار" class="logo">` : ""}
      </div>
    </div>

    <!-- Beneficiary Information -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-icon">📋</div>
        بيانات المستفيد
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">الاسم الكامل</span>
          <span class="info-value highlight">${beneficiary.name || ""}</span>
        </div>
        <div class="info-row">
          <span class="info-label">رقم الهوية</span>
          <span class="info-value">${beneficiary.nationalId || ""}</span>
          <span class="info-label">رقم الملف</span>
          <span class="info-value">${beneficiary.beneficiaryNumber || ""}</span>
        </div>
        <div class="info-row">
          <span class="info-label">رقم الجوال</span>
          <span class="info-value">${beneficiary.phone || ""}</span>
          <span class="info-label">تمت المعالجة بواسطة</span>
          <span class="info-value">${employeeInfo}</span>
        </div>
      </div>
    </div>

    <!-- Pledge Text -->
    <div class="pledge-card">
      <div class="pledge-title">نص الإقرار والتعهد</div>
      <p class="pledge-text">${pledgeText}</p>
    </div>

    <!-- Signature and Date -->
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-area">
          ${
            signatureData
              ? `<img src="${signatureData}" alt="التوقيع">`
              : `<span class="no-signature">لا يوجد توقيع</span>`
          }
        </div>
        <div class="signature-label">توقيع المستفيد</div>
      </div>
      <div class="date-card">
        <div><strong>التاريخ:</strong> ${dateStr}</div>
        <div><strong>الوقت:</strong> ${timeStr}</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      هذا المستند تم إنشاؤه إلكترونياً ولا يحتاج إلى ختم
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Generate pledge PDF and save to disk.
 * Returns relative path for DB storage.
 */
const generatePledgePdf = async ({
  beneficiary,
  pledgeText,
  signatureData,
  processedBy,
  signedAt,
  pledgeYear,
}) => {
  const now = new Date(signedAt);
  const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const subDir = path.join(PLEDGES_PATH, yearMonth);

  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }

  const fileName = `pledge_${beneficiary.id}_${Date.now()}.pdf`;
  const relativePath = `${yearMonth}/${fileName}`;
  const filePath = path.join(subDir, fileName);

  const html = generatePledgeHtml({
    beneficiary,
    pledgeText,
    signatureData,
    processedBy,
    signedAt,
    pledgeYear,
  });

  await renderPdf(html, filePath);
  return relativePath;
};

/**
 * Get full file path from relative path stored in database.
 */
const getFullPledgePdfPath = (relativePath) => {
  if (!relativePath) return null;
  return path.join(PLEDGES_PATH, relativePath);
};

module.exports = {
  generatePledgePdf,
  getFullPledgePdfPath,
};