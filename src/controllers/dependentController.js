const { Dependent, Beneficiary, FieldConfig } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");
const { calculateAge } = require("../utils/ageHelper");

const getDependents = async (req, res, next) => {
  try {
    const { beneficiaryId } = req.params;

    const beneficiary = await Beneficiary.findByPk(beneficiaryId);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    const dependents = await Dependent.findAll({
      where: { beneficiaryId },
      order: [["createdAt", "ASC"]],
    });

    const withAge = dependents.map((d) => {
      const json = d.toJSON();
      json.age = calculateAge(json.dateOfBirth);
      return json;
    });

    res.json({ success: true, dependents: withAge });
  } catch (error) {
    next(error);
  }
};

const createDependent = async (req, res, next) => {
  try {
    const { beneficiaryId } = req.params;

    const beneficiary = await Beneficiary.findByPk(beneficiaryId);
    if (!beneficiary) throw new NotFoundError("المستفيد غير موجود");

    // Check if dependent's nationalId is already a beneficiary
    if (req.body.nationalId) {
      const existingBeneficiary = await Beneficiary.findOne({
        where: { nationalId: req.body.nationalId },
      });
      if (existingBeneficiary) {
        throw new ValidationError(
          `رقم الهوية مسجل كمستفيد أساسي (${existingBeneficiary.name} - ${existingBeneficiary.beneficiaryNumber})`
        );
      }
    }

    const dependent = await Dependent.create({
      ...req.body,
      beneficiaryId: parseInt(beneficiaryId),
    });

    // Update dependents count
    const count = await Dependent.count({ where: { beneficiaryId } });
    await beneficiary.update({ dependentsCount: count });

    res.status(201).json({ success: true, dependent });
  } catch (error) {
    next(error);
  }
};

const updateDependent = async (req, res, next) => {
  try {
    const dependent = await Dependent.findByPk(req.params.dependentId);
    if (!dependent) throw new NotFoundError("التابع غير موجود");

    await dependent.update(req.body);

    res.json({ success: true, dependent });
  } catch (error) {
    next(error);
  }
};

const deleteDependent = async (req, res, next) => {
  try {
    const dependent = await Dependent.findByPk(req.params.dependentId);
    if (!dependent) throw new NotFoundError("التابع غير موجود");

    const { beneficiaryId } = dependent;
    await dependent.destroy();

    // Update dependents count
    const count = await Dependent.count({ where: { beneficiaryId } });
    await Beneficiary.update({ dependentsCount: count }, { where: { id: beneficiaryId } });

    res.json({ success: true, message: "تم حذف التابع" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDependents,
  createDependent,
  updateDependent,
  deleteDependent,
};
