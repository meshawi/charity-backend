const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Document, Beneficiary, User } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const auditService = require("../services/auditService");
const { DOCUMENTS_PATH, ensureDirectories } = require("../config/storage");

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
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError("نوع الملف غير مدعوم"));
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

      await auditService.logUpdate(req, "DOCUMENT", existing.id, { type }, {
        type,
        filename: req.file.filename,
        replaced: true,
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

    await auditService.logCreate(req, "DOCUMENT", document.id, {
      beneficiaryId,
      type,
      filename: req.file.filename,
    });

    res.status(201).json({ success: true, document });
  } catch (error) {
    next(error);
  }
};

// Get documents for a beneficiary
const getDocuments = async (req, res, next) => {
  try {
    const { beneficiaryId } = req.params;

    const beneficiary = await Beneficiary.findByPk(beneficiaryId);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    const documents = await Document.findAll({
      where: { beneficiaryId },
      include: [{ model: User, as: "uploadedBy", attributes: ["id", "name"] }],
      order: [["updatedAt", "DESC"]],
    });

    res.json({ success: true, documents });
  } catch (error) {
    next(error);
  }
};

// Download a document
const downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) throw new NotFoundError("المستند غير موجود");

    const filePath = path.join(DOCUMENTS_PATH, String(document.beneficiaryId), document.filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("الملف غير موجود على الخادم");
    }

    res.download(filePath, document.originalName);
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

    const oldValues = document.toJSON();
    await document.destroy();

    await auditService.logDelete(req, "DOCUMENT", document.id, oldValues);

    res.json({ success: true, message: "تم حذف المستند" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMiddleware,
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument,
};
