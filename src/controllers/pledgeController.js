const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");
const { Beneficiary, Pledge, User } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const {
  generatePledgePdf,
  getFullPledgePdfPath,
} = require("../utils/pledgePdfGenerator");

// Default pledge text — shown to the beneficiary before signing
const DEFAULT_PLEDGE_TEXT =
  "أتعهد أنا (المستفيد أو من يمثله) بأن جميع المعلومات التي تم الإدلاء بها (الباحث/ ة) في هذه الاستمارة صحيحة وتوافق الواقع وأقر بأنه قد تم إفهامي بأنه في حالة أنه تم اعتمادي كمستحق فإن مصدر ما يتم صرفه لي هو من الصدقات والكفارات والزكاة الشرعية، و إني غير مستفيد في جمعية أخرى وإن تبين خلاف ذلك فإني أتحمل كامل المسؤولية القانونية و الشرعية وعلى ذلك أوقع .";

// Look up beneficiary by national ID or beneficiary number
const lookupBeneficiary = async (req, res, next) => {
  try {
    const { searchQuery } = req.query;
    if (!searchQuery) throw new ValidationError("يرجى إدخال رقم الهوية أو رقم الملف");

    const beneficiary = await Beneficiary.findOne({
      where: {
        [Op.or]: [
          { nationalId: searchQuery },
          { beneficiaryNumber: searchQuery },
        ],
      },
      attributes: ["id", "beneficiaryNumber", "name", "nationalId", "phone"],
      include: [
        {
          model: Pledge,
          as: "pledge",
          attributes: ["id", "pdfFile", "signedAt"],
        },
      ],
    });

    if (!beneficiary) {
      return res.json({ success: true, found: false, message: "المستفيد غير موجود" });
    }

    // Already signed — return info + existing PDF reference
    if (beneficiary.pledge) {
      return res.json({
        success: true,
        found: true,
        alreadySigned: true,
        message: "المستفيد وقّع الإقرار مسبقاً",
        beneficiary: {
          id: beneficiary.id,
          beneficiaryNumber: beneficiary.beneficiaryNumber,
          name: beneficiary.name,
          nationalId: beneficiary.nationalId,
        },
        pledge: {
          id: beneficiary.pledge.id,
          signedAt: beneficiary.pledge.signedAt,
        },
      });
    }

    // Not signed yet — return beneficiary info + pledge text
    res.json({
      success: true,
      found: true,
      alreadySigned: false,
      beneficiary: {
        id: beneficiary.id,
        beneficiaryNumber: beneficiary.beneficiaryNumber,
        name: beneficiary.name,
        nationalId: beneficiary.nationalId,
        phone: beneficiary.phone,
      },
      pledgeText: DEFAULT_PLEDGE_TEXT,
    });
  } catch (error) {
    next(error);
  }
};

// Create pledge (sign acknowledgment)
const createPledge = async (req, res, next) => {
  try {
    const { beneficiaryId, signature } = req.body;

    if (!beneficiaryId) throw new ValidationError("يرجى تحديد المستفيد");
    if (!signature) throw new ValidationError("يرجى التوقيع أولاً");

    const beneficiary = await Beneficiary.findByPk(beneficiaryId, {
      attributes: ["id", "beneficiaryNumber", "name", "nationalId", "phone"],
    });
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    // Check if already signed
    const existing = await Pledge.findOne({ where: { beneficiaryId } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "المستفيد وقّع الإقرار مسبقاً",
        pledge: { id: existing.id, signedAt: existing.signedAt },
      });
    }

    const processedBy = await User.findByPk(req.user.id);
    const signedAt = new Date();

    // Generate PDF
    let pdfFile = null;
    try {
      pdfFile = await generatePledgePdf({
        beneficiary,
        pledgeText: DEFAULT_PLEDGE_TEXT,
        signatureData: signature,
        processedBy,
        signedAt,
      });
    } catch (pdfError) {
      console.error("خطأ في إنشاء PDF الإقرار:", pdfError);
    }

    const pledge = await Pledge.create({
      beneficiaryId,
      processedById: req.user.id,
      pledgeText: DEFAULT_PLEDGE_TEXT,
      pdfFile,
      signedAt,
    });

    res.status(201).json({ success: true, pledge });
  } catch (error) {
    next(error);
  }
};

// Get / stream pledge PDF
const getPledgePdf = async (req, res, next) => {
  try {
    const pledge = await Pledge.findByPk(req.params.id, {
      include: [
        {
          model: Beneficiary,
          as: "beneficiary",
          attributes: ["id", "beneficiaryNumber", "name", "nationalId", "phone"],
        },
      ],
    });

    if (!pledge) throw new NotFoundError("الإقرار غير موجود");

    if (pledge.pdfFile) {
      const filePath = getFullPledgePdfPath(pledge.pdfFile);
      if (filePath && fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${path.basename(pledge.pdfFile)}"`
        );
        return res.sendFile(filePath);
      }
    }

    // PDF not found on disk — return error
    throw new NotFoundError("ملف الإقرار غير موجود");
  } catch (error) {
    next(error);
  }
};

// List all pledges (with pagination)
const getPledges = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const include = [
      {
        model: Beneficiary,
        as: "beneficiary",
        attributes: ["id", "beneficiaryNumber", "name", "nationalId"],
        ...(search && {
          where: {
            [Op.or]: [
              { beneficiaryNumber: { [Op.like]: `%${search}%` } },
              { nationalId: { [Op.like]: `%${search}%` } },
              { name: { [Op.like]: `%${search}%` } },
            ],
          },
        }),
      },
      { model: User, as: "processedBy", attributes: ["id", "name"] },
    ];

    const { count, rows } = await Pledge.findAndCountAll({
      include,
      order: [["signedAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      pledges: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  lookupBeneficiary,
  createPledge,
  getPledgePdf,
  getPledges,
};
