const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Path to brand logo
const BRAND_LOGO_PATH = path.join(__dirname, "../config/brand.png");

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

// Format date in Arabic (Asia/Riyadh = UTC+3)
const formatDateArabic = (date) => {
  if (!date) return "";
  const d = new Date(date);
  // Use Intl to get Riyadh-local date parts
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day").value;
  const month = parts.find((p) => p.type === "month").value;
  const year = parts.find((p) => p.type === "year").value;
  return `${day}/${month}/${year}`;
};

// Format time in Arabic (Asia/Riyadh = UTC+3)
const formatTimeArabic = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  });
};

// ── Shared Puppeteer browser singleton ──
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
 * Render HTML to PDF.
 * If filePath is given the PDF is written to disk (returns null).
 * Otherwise returns a Buffer.
 */
const renderPdf = async (html, filePath) => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: ["load", "networkidle0"] });
  await page.evaluateHandle("document.fonts.ready");

  const opts = {
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  };

  if (filePath) {
    opts.path = filePath;
    await page.pdf(opts);
    await page.close();
    return null;
  }

  const buffer = await page.pdf(opts);
  await page.close();
  return buffer;
};

/**
 * Base CSS shared across all PDF templates.
 * Individual templates append their own rules after this block.
 */
const BASE_CSS = `
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
      padding: 10mm 25mm 20mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
    }
    
    .page::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 5px;
      background: linear-gradient(90deg, #1a5f7a, #159895, #57c5b6);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
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
      width: 140px;
      height: auto;
      border: none;
      outline: none;
    }
    
    .card {
      margin: 15px 0;
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
    
    .date-card {
      text-align: center;
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      padding: 12px 20px;
      border-radius: 10px;
      border: 2px solid #1a5f7a;
    }
    
    .date-card div {
      font-size: 10pt;
      color: #495057;
      margin: 4px 0;
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
`;

module.exports = {
  getLogoBase64,
  formatDateArabic,
  formatTimeArabic,
  renderPdf,
  BASE_CSS,
};
