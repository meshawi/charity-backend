const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { PDF_PATH } = require("../config/storage");

// Path to brand logo
const BRAND_LOGO_PATH = path.join(__dirname, "../config/brand.png");

// Use centralized PDF storage path
const ACKNOWLEDGMENTS_DIR = PDF_PATH;

// Ensure acknowledgments directory exists
if (!fs.existsSync(ACKNOWLEDGMENTS_DIR)) {
  fs.mkdirSync(ACKNOWLEDGMENTS_DIR, { recursive: true });
}

// Convert image to base64 for embedding in HTML
const getLogoBase64 = () => {
  try {
    if (fs.existsSync(BRAND_LOGO_PATH)) {
      const imageBuffer = fs.readFileSync(BRAND_LOGO_PATH);
      const base64 = imageBuffer.toString("base64");
      const mimeType = "image/png";
      return `data:${mimeType};base64,${base64}`;
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
  return d.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إقرار استلام</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
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
    
    /* Decorative top border */
    .page::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, #1a5f7a, #159895, #57c5b6);
    }
    
    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e8e8e8;
    }
    
    .header-right {
      text-align: right;
    }
    
    .main-title {
      font-size: 26pt;
      font-weight: 700;
      color: #1a5f7a;
      letter-spacing: 1px;
      margin: 0;
    }
    
    .header-left {
      text-align: left;
    }
    
    .logo {
      width: 80px;
      height: auto;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    
    /* Info Cards */
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
    
    .card-body {
      padding: 20px;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 0;
      border-bottom: 1px dashed #e9ecef;
      flex-wrap: wrap;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
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
    
    /* Two column layout */
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    /* Declaration and Signature Section */
    .declaration-signature-section {
      margin: 25px 0;
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 20px;
      align-items: start;
    }
    
    /* Declaration Section */
    .declaration-card {
      background: linear-gradient(135deg, #fff9e6, #fff3cd);
      border: 2px solid #ffc107;
      border-radius: 12px;
      padding: 20px 25px;
    }
    
    .declaration-title {
      font-size: 14pt;
      font-weight: 700;
      color: #856404;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .declaration-title::before {
      content: '⚠';
      font-size: 18pt;
    }
    
    .declaration-text {
      font-size: 11pt;
      line-height: 2;
      color: #664d03;
      text-align: justify;
    }
    
    /* Signature Section */
    .signature-section {
      display: flex;
      flex-direction: column;
      justify-content: start;
      align-items: center;
    }
    
    .signature-box {
      text-align: center;
      width: 100%;
      margin-bottom: 20px;
    }
    
    .signature-area {
      border: 3px solid #1a5f7a;
      border-radius: 12px;
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8f9fa, #fff);
      margin-bottom: 10px;
      padding: 15px;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .signature-area img {
      max-width: 200px;
      max-height: 80px;
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
    
    /* Date Card under signature */
    .date-card {
      text-align: center;
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 12px 20px;
      border-radius: 10px;
      border: 2px solid #1a5f7a;
      width: 100%;
    }
    
    .date-card div {
      font-size: 10pt;
      color: #495057;
      margin: 4px 0;
    }
    
    /* Footer */
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
    
    /* Print optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        margin: 0;
        padding: 15mm 20mm;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
   <div class="header">
  <div class="header-right">
    <h1 class="main-title">إقرار استلام مساعدة</h1>
  </div>
  <div class="header-left">
    ${logoBase64 ? `<img src="${logoBase64}" alt="الشعار" class="logo">` : ""}
  </div>
</div>

    
    <!-- Combined Program and Beneficiary Information -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-icon">📋</div>
        معلومات البرنامج والمستفيد
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">اسم البرنامج</span>
          <span class="info-value highlight">${program.name}</span>
          <span class="info-label">فترة البرنامج</span>
          <span class="info-value">${startDateStr} - ${endDateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">الاسم الكامل</span>
          <span class="info-value">${fullName}</span>
          <span class="info-label">رقم الهوية</span>
          <span class="info-value">${profileData.nationalId}</span>
          <span class="info-label">رقم الجوال</span>
          <span class="info-value">${profileData.phone || ""}</span>
        </div>
      </div>
    </div>
    
    <!-- Disbursement Details -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-icon">✅</div>
        تفاصيل الصرف
      </div>
      <div class="card-body">
        <div class="info-row">
          <span class="info-label">تمت المعالجة بواسطة</span>
          <span class="info-value">${employeeInfo}</span>
          <span class="info-label">تم الاستلام بواسطة</span>
          <span class="info-value">${receiverText}</span>
        </div>
        ${
          disbursement.notes
            ? `
        <div class="info-row">
          <span class="info-label">ملاحظات</span>
          <span class="info-value">${disbursement.notes}</span>
        </div>
        `
            : ""
        }
      </div>
    </div>
    
    <!-- Declaration and Signature Section -->
    <div class="declaration-signature-section">
      <!-- Declaration -->
      <div class="declaration-card">
        <div class="declaration-title">إقرار وتعهد</div>
        <p class="declaration-text">
          أتعهد أنا (المستفيد أو من يمثله) بأن جميع المعلومات التي تم الادلاء بها (للباحث/ للباحثة) في هذه الاستمارة صحيحة وتوافق الواقع، وأقر بأنه قد تم إفهامي بأنه في حالة أنه تم اعتمادي كمستحق فإن مصدر ما يتم صرفه لي هو من الصدقات والكفارات والزكاة الشرعية، وعلى ذلك أوقع.
        </p>
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
          <div class="signature-label">توقيع المستفيد / المستلم</div>
        </div>
        
        <div class="date-card">
          <div><strong>التاريخ:</strong> ${disbursedAtDate}</div>
          <div><strong>الوقت:</strong> ${disbursedAtTime}</div>
        </div>
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

// Get Puppeteer browser instance
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

// Close browser on process exit
process.on("exit", async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
});

process.on("SIGINT", async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit();
});

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
  // Create subdirectory by year/month for better organization
  const now = new Date();
  const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const subDir = path.join(ACKNOWLEDGMENTS_DIR, yearMonth);
  
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }

  const fileName = `acknowledgment_${disbursement.id}_${Date.now()}.pdf`;
  const relativePath = `${yearMonth}/${fileName}`;
  const filePath = path.join(subDir, fileName);

  try {
    const html = generateAcknowledgmentHtml({
      disbursement,
      caseData: profileData,
      program,
      disbursedBy,
      signatureData,
    });

    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
    });

    // Wait for fonts to load
    await page.evaluateHandle("document.fonts.ready");

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    await page.close();

    // Return relative path for database storage
    return relativePath;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
};

/**
 * Stream PDF on-the-fly for legacy records (no saved file)
 */
const streamAcknowledgmentPdf = async (
  { disbursement, caseData: profileData, program, disbursedBy },
  res
) => {
  try {
    const html = generateAcknowledgmentHtml({
      disbursement,
      caseData: profileData,
      program,
      disbursedBy,
      signatureData: null, // Legacy records don't have signatures
    });

    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ["load", "networkidle0"],
    });

    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    await page.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="acknowledgment_${disbursement.id}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF streaming error:", error);
    throw error;
  }
};

const getAcknowledgmentsDir = () => ACKNOWLEDGMENTS_DIR;

// Get full path from relative path stored in database
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
