const path = require("path");
const fs = require("fs");

// Get default storage path based on OS
const getDefaultStoragePath = () => {
  if (process.platform === "win32") {
    return "C:\\charity-storage";
  }
  return "/tmp/charity-storage";
};

// Base paths - use environment variables or OS-specific defaults
const DOCUMENTS_BASE = process.env.DOCUMENTS_BASE_PATH || getDefaultStoragePath();
const PDF_PATH = process.env.PDF_STORAGE_PATH || path.join(DOCUMENTS_BASE, "PDFs");
const REPORTS_PATH = process.env.REPORTS_STORAGE_PATH || path.join(DOCUMENTS_BASE, "Reports");
const BACKUPS_PATH = process.env.BACKUPS_STORAGE_PATH || path.join(DOCUMENTS_BASE, "Backups");
const DOCUMENTS_PATH = process.env.DOCUMENTS_STORAGE_PATH || path.join(DOCUMENTS_BASE, "Documents");

// Ensure all directories exist
const ensureDirectories = () => {
  const dirs = [DOCUMENTS_BASE, PDF_PATH, REPORTS_PATH, BACKUPS_PATH, DOCUMENTS_PATH];
  
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Initialize directories on module load
ensureDirectories();

// Clean old files from a directory (older than specified hours)
const cleanOldFiles = (directory, maxAgeHours = 24) => {
  if (!fs.existsSync(directory)) return 0;

  const files = fs.readdirSync(directory);
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  let cleaned = 0;

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile() && now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    } catch (err) {
      console.error(`Failed to clean file: ${file}`, err.message);
    }
  });

  return cleaned;
};

// Get storage stats - RECURSIVELY counts files in subdirectories
const getStorageStats = () => {
  const getDirectoryStatsRecursive = (dir) => {
    if (!fs.existsSync(dir)) return { files: 0, size: 0 };
    
    let totalSize = 0;
    let fileCount = 0;

    const processDirectory = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);
        
        items.forEach((item) => {
          const itemPath = path.join(currentDir, item);
          try {
            const stats = fs.statSync(itemPath);
            if (stats.isFile()) {
              totalSize += stats.size;
              fileCount++;
            } else if (stats.isDirectory()) {
              // Recursively process subdirectories
              processDirectory(itemPath);
            }
          } catch (e) {
            // Skip files we can't read
          }
        });
      } catch (e) {
        // Skip directories we can't read
      }
    };

    processDirectory(dir);
    return { files: fileCount, size: totalSize };
  };

  return {
    pdfs: getDirectoryStatsRecursive(PDF_PATH),
    reports: getDirectoryStatsRecursive(REPORTS_PATH),
    backups: getDirectoryStatsRecursive(BACKUPS_PATH),
    documents: getDirectoryStatsRecursive(DOCUMENTS_PATH),
  };
};

module.exports = {
  DOCUMENTS_BASE,
  PDF_PATH,
  REPORTS_PATH,
  BACKUPS_PATH,
  DOCUMENTS_PATH,
  ensureDirectories,
  cleanOldFiles,
  getStorageStats,
};
