const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Document, Beneficiary, User } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { DOCUMENTS_PATH, ensureDirectories } = require("../config/storage");
const { sendBackToReview } = require("../utils/reviewWorkflow");
const { DOCUMENT_TYPES, OTHER_DOCUMENT_TYPE } = require("../utils/constants");

const MAX_TITLE_LENGTH = 150;

// Delete an uploaded file that ended up not being attached to a record
const discardUpload = (file) => {
  if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
};

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
  let recordSaved = false;
  try {
    const { beneficiaryId } = req.params;
    const { type } = req.body;
    const isOther = type === OTHER_DOCUMENT_TYPE;
    const title = isOther ? (req.body.title || "").trim() : null;
    const notes = (req.body.notes || "").trim() || null;

    if (!type) throw new ValidationError("نوع المستند مطلوب");
    if (!VALID_DOC_TYPES.has(type)) throw new ValidationError("نوع المستند غير صالح");
    if (!req.file) throw new ValidationError("الملف مطلوب");
    if (isOther && !title) throw new ValidationError("عنوان المستند مطلوب عند اختيار (أخرى)");
    if (isOther && title.length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`عنوان المستند يجب ألا يتجاوز ${MAX_TITLE_LENGTH} حرفاً`);
    }

    const beneficiary = await Beneficiary.findByPk(beneficiaryId);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    const originalName = Document.fixFilenameEncoding(req.file.originalname);

    // Fixed types hold one document each (a new upload replaces it);
    // "other" documents are told apart by title, so they are always added.
    const existing = isOther
      ? null
      : await Document.findOne({ where: { beneficiaryId, type } });

    if (existing) {
      const oldPath = path.join(DOCUMENTS_PATH, String(beneficiaryId), existing.filename);

      await existing.update({
        notes,
        filename: req.file.filename,
        originalName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedById: req.user.id,
      });
      recordSaved = true;

      // Delete the old file only once the record points at the new one
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      const sentToReview = await sendBackToReview(beneficiary);

      return res.json({ success: true, document: existing, replaced: true, sentToReview });
    }

    // Create new document record
    const document = await Document.create({
      beneficiaryId: parseInt(beneficiaryId),
      type,
      title,
      notes,
      filename: req.file.filename,
      originalName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedById: req.user.id,
    });
    recordSaved = true;

    const sentToReview = await sendBackToReview(beneficiary);

    res.status(201).json({ success: true, document, sentToReview });
  } catch (error) {
    // Multer writes the file before validation runs — don't leave it orphaned
    if (!recordSaved) discardUpload(req.file);
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

    const sentToReview = await sendBackToReview(await Beneficiary.findByPk(document.beneficiaryId));

    res.json({ success: true, message: "تم حذف المستند", sentToReview });
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
