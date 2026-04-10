const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { PLEDGES_PATH } = require("../config/storage");

// Path to brand logo
const BRAND_LOGO_PATH = path.join(__dirname, "../config/brand.png");

// Ensure pledges directory exists
if (!fs.existsSync(PLEDGES_PATH)) {
  fs.mkdirSync(PLEDGES_PATH, { recursive: true });
}

// Convert image to base64 for embedding in HTML
const getLogoBase64 = () => {
  try {
    if (fs.existsSync(BRAND_LOGO_PATH)) {
      const imageBuffer = fs.readFileSync(BRAND_LOGO_PATH);
      return `data:image/png;base64,${imageBuffer.toString("base64")}`;
    }
  } catch (e) {
    console.error("Failed to load logo:", e);
  }
  return null;
};

// Format date in Arabic
const formatDateArabic = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format time in Arabic
const formatTimeArabic = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
};

// Generate HTML template for pledge PDF
const generatePledgeHtml = ({
  beneficiary,
  pledgeText,
  signatureData,
  processedBy,
  signedAt,
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
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Noto Sans Arabic', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #2c3e50;
      background: #fff;
      direction: rtl;
    }
    
    .page {
      width: 210mm;
      height: 297mm;
      padding: 20mm 25mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
    }
    
    .page::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, #1a5f7a, #159895, #57c5b6);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e8e8e8;
    }
    
    .header-right { text-align: right; }
    
    .main-title {
      font-size: 26pt;
      font-weight: 700;
      color: #1a5f7a;
      letter-spacing: 1px;
      margin: 0;
    }
    
    .header-left { text-align: left; }
    
    .logo {
      width: 80px;
      height: auto;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    
    .card {
      margin: 20px 0;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 15px rgba(0,0,0,0.05);
      overflow: hidden;
      border: 1px solid #e9ecef;
    }
    
    .card-header {
      background: linear-gradient(135deg, #1a5f7a, #159895);
      color: #fff;
      padding: 12px 20px;
      font-size: 13pt;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .card-header-icon {
      width: 24px;
      height: 24px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .card-body { padding: 20px; }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 0;
      border-bottom: 1px dashed #e9ecef;
      flex-wrap: wrap;
    }
    
    .info-row:last-child { border-bottom: none; }
    
    .info-label {
      font-size: 10pt;
      color: #6c757d;
      font-weight: 500;
      min-width: 80px;
    }
    
    .info-value {
      font-size: 11pt;
      font-weight: 600;
      color: #2c3e50;
      flex: 0 1 auto;
    }
    
    .info-value.highlight {
      color: #1a5f7a;
      font-size: 12pt;
    }
    
    /* Pledge text section */
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
    
    /* Signature section */
    .signature-section {
      margin-top: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      align-items: end;
    }
    
    .signature-box { text-align: center; }
    
    .signature-area {
      border: 3px solid #1a5f7a;
      border-radius: 12px;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8f9fa, #fff);
      margin-bottom: 10px;
      padding: 15px;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .signature-area img {
      max-width: 220px;
      max-height: 100px;
    }
    
    .signature-label {
      font-size: 11pt;
      font-weight: 600;
      color: #1a5f7a;
      padding-top: 10px;
      border-top: 2px solid #1a5f7a;
      margin-top: 5px;
    }
    
    .no-signature {
      color: #adb5bd;
      font-size: 10pt;
      font-style: italic;
    }
    
    .date-card {
      text-align: center;
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 15px 20px;
      border-radius: 10px;
      border: 2px solid #1a5f7a;
    }
    
    .date-card div {
      font-size: 10pt;
      color: #495057;
      margin: 6px 0;
    }
    
    .footer {
      position: absolute;
      bottom: 15mm;
      left: 25mm;
      right: 25mm;
      text-align: center;
      font-size: 9pt;
      color: #adb5bd;
      border-top: 1px solid #e9ecef;
      padding-top: 15px;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { margin: 0; padding: 15mm 20mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-right">
        <h1 class="main-title">إقرار وتعهد</h1>
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

// Get Puppeteer browser instance (shared singleton)
let browserInstance = null;

const getBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    });
  }
  return browserInstance;
};

process.on("exit", async () => {
  if (browserInstance) await browserInstance.close();
});

process.on("SIGINT", async () => {
  if (browserInstance) await browserInstance.close();
  process.exit();
});

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
  });

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: ["load", "networkidle0"] });
  await page.evaluateHandle("document.fonts.ready");

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await page.close();
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
