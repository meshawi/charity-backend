const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Document, Beneficiary, User } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { DOCUMENTS_PATH, ensureDirectories } = require("../config/storage");

// Fixed document types
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
];

const VALID_DOC_TYPES = new Set(DOCUMENT_TYPES.map((d) => d.key));

// Multer config for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(DOCUMENTS_PATH, String(req.params.beneficiaryId));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${req.body.type || "doc"}_${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError("نوع الملف غير مدعوم — يسمح فقط بصور و PDF"));
    }
  },
});

const uploadMiddleware = upload.single("file");

// Upload or replace a document
const uploadDocument = async (req, res, next) => {
  try {
    const { beneficiaryId } = req.params;
    const { type } = req.body;

    if (!type) throw new ValidationError("نوع المستند مطلوب");
    if (!VALID_DOC_TYPES.has(type)) throw new ValidationError("نوع المستند غير صالح");
    if (!req.file) throw new ValidationError("الملف مطلوب");

    const beneficiary = await Beneficiary.findByPk(beneficiaryId);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    // Check if a document of same type exists (replace it)
    const existing = await Document.findOne({
      where: { beneficiaryId, type },
    });

    if (existing) {
      // Delete old file from disk
      const oldPath = path.join(DOCUMENTS_PATH, String(beneficiaryId), existing.filename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      await existing.update({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedById: req.user.id,
      });

      return res.json({ success: true, document: existing, replaced: true });
    }

    // Create new document record
    const document = await Document.create({
      beneficiaryId: parseInt(beneficiaryId),
      type,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedById: req.user.id,
    });

    res.status(201).json({ success: true, document });
  } catch (error) {
    next(error);
  }
};

// View/preview a document inline (images & PDFs)
const viewDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) throw new NotFoundError("المستند غير موجود");

    const filePath = path.join(DOCUMENTS_PATH, String(document.beneficiaryId), document.filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("الملف غير موجود على الخادم");
    }

    const mimeType = document.mimeType || "application/octet-stream";
    res.set("Content-Type", mimeType);
    res.set("Content-Disposition", `inline; filename="${encodeURIComponent(document.originalName)}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    next(error);
  }
};

// Delete a document
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) throw new NotFoundError("المستند غير موجود");

    // Delete file from disk
    const filePath = path.join(DOCUMENTS_PATH, String(document.beneficiaryId), document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await document.destroy();

    res.json({ success: true, message: "تم حذف المستند" });
  } catch (error) {
    next(error);
  }
};

// Get fixed document types
const getDocumentTypes = (req, res) => {
  res.json({ success: true, types: DOCUMENT_TYPES });
};

module.exports = {
  uploadMiddleware,
  uploadDocument,
  viewDocument,
  deleteDocument,
  getDocumentTypes,
};
