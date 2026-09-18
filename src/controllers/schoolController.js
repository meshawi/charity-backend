const { QueryTypes } = require("sequelize");
const { School, Dependent, sequelize } = require("../models");
const { NotFoundError, ValidationError } = require("../utils/errors");

const MAX_NAME_LENGTH = 150;

const SCHOOLS = `\`${School.getTableName()}\``;
const DEPENDENTS = `\`${Dependent.getTableName()}\``;

// Dependents are linked to a school by name. Matching is done in SQL so it
// follows the database collation (same rules everywhere: counts, rename, transfer).

/** Schools with the number of dependents using each one */
const findSchoolsWithCounts = (transaction) =>
  sequelize.query(
    `SELECT s.id, s.name, COUNT(d.id) AS dependentsCount
       FROM ${SCHOOLS} s
       LEFT JOIN ${DEPENDENTS} d ON d.schoolName = s.name
      GROUP BY s.id, s.name
      ORDER BY s.name ASC`,
    { type: QueryTypes.SELECT, transaction }
  );

/** School names typed on dependents that are not in the managed list */
const findUnlistedNames = (transaction) =>
  sequelize.query(
    `SELECT TRIM(d.schoolName) AS name, COUNT(*) AS dependentsCount
       FROM ${DEPENDENTS} d
       LEFT JOIN ${SCHOOLS} s ON s.name = TRIM(d.schoolName)
      WHERE d.schoolName IS NOT NULL AND TRIM(d.schoolName) <> '' AND s.id IS NULL
      GROUP BY TRIM(d.schoolName)
      ORDER BY dependentsCount DESC, name ASC`,
    { type: QueryTypes.SELECT, transaction }
  );

const countDependents = async (schoolName, transaction) => {
  const [row] = await sequelize.query(
    `SELECT COUNT(*) AS total FROM ${DEPENDENTS} WHERE schoolName = :schoolName`,
    { replacements: { schoolName }, type: QueryTypes.SELECT, transaction }
  );
  return Number(row.total);
};

/** Point every dependent of one school at another name */
const moveDependents = (fromName, toName, transaction) =>
  sequelize.query(
    `UPDATE ${DEPENDENTS} SET schoolName = :toName WHERE schoolName = :fromName`,
    { replacements: { fromName, toName }, type: QueryTypes.UPDATE, transaction }
  );

const cleanName = (raw) => {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) throw new ValidationError("اسم المدرسة مطلوب");
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`اسم المدرسة يجب ألا يتجاوز ${MAX_NAME_LENGTH} حرفاً`);
  }
  return name;
};

const toNumberCounts = (rows) =>
  rows.map((r) => ({ ...r, dependentsCount: Number(r.dependentsCount) }));

// List for everyone who fills in dependents; the management page also gets the unlisted names
const getSchools = async (req, res, next) => {
  try {
    const [schools, unlisted] = await Promise.all([findSchoolsWithCounts(), findUnlistedNames()]);
    res.json({
      success: true,
      schools: toNumberCounts(schools),
      unlisted: toNumberCounts(unlisted),
    });
  } catch (error) {
    next(error);
  }
};

const createSchool = async (req, res, next) => {
  try {
    const name = cleanName(req.body.name);

    const existing = await School.findOne({ where: { name } });
    if (existing) throw new ValidationError("المدرسة موجودة في القائمة بالفعل");

    const school = await School.create({ name });
    res.status(201).json({ success: true, message: "تمت إضافة المدرسة", school });
  } catch (error) {
    next(error);
  }
};

// Add every school name already typed on dependents to the list
const importUnlisted = async (req, res, next) => {
  try {
    const imported = await sequelize.transaction(async (transaction) => {
      const unlisted = await findUnlistedNames(transaction);
      // Names are imported exactly as typed so the dependents that use them stay linked
      const names = unlisted.map((u) => u.name).filter((n) => n.length <= MAX_NAME_LENGTH);
      await School.bulkCreate(
        names.map((name) => ({ name })),
        { ignoreDuplicates: true, transaction }
      );
      return names.length;
    });

    res.json({ success: true, message: `تم استيراد ${imported} مدرسة`, imported });
  } catch (error) {
    next(error);
  }
};

// Renaming a school renames it on every dependent that has it
const updateSchool = async (req, res, next) => {
  try {
    const name = cleanName(req.body.name);

    const updatedDependents = await sequelize.transaction(async (transaction) => {
      const school = await School.findByPk(req.params.id, { transaction });
      if (!school) throw new NotFoundError("المدرسة غير موجودة");

      const clash = await School.findOne({ where: { name }, transaction });
      if (clash && clash.id !== school.id) {
        throw new ValidationError(
          "توجد مدرسة أخرى بهذا الاسم — لدمج مدرستين احذف إحداهما وانقل تابعيها إلى الأخرى"
        );
      }

      const oldName = school.name;
      const total = await countDependents(oldName, transaction);
      await school.update({ name }, { transaction });
      if (total > 0) await moveDependents(oldName, name, transaction);
      return total;
    });

    res.json({ success: true, message: "تم تحديث المدرسة", updatedDependents });
  } catch (error) {
    next(error);
  }
};

// Deleting a school that is in use needs an explicit choice:
//   mode "transfer" + transferToId → its dependents move to another school
//   mode "keep"                    → dependents keep the name on their file; only the list entry goes
const deleteSchool = async (req, res, next) => {
  try {
    const { mode, transferToId } = req.query;

    const affected = await sequelize.transaction(async (transaction) => {
      const school = await School.findByPk(req.params.id, { transaction });
      if (!school) throw new NotFoundError("المدرسة غير موجودة");

      const total = await countDependents(school.name, transaction);

      if (total > 0) {
        if (mode === "transfer") {
          const target = transferToId && (await School.findByPk(transferToId, { transaction }));
          if (!target || target.id === school.id) {
            throw new ValidationError("اختر مدرسة أخرى لنقل التابعين إليها");
          }
          await moveDependents(school.name, target.name, transaction);
        } else if (mode !== "keep") {
          throw new ValidationError(
            `المدرسة مرتبطة بـ ${total} تابع — اختر نقلهم إلى مدرسة أخرى أو إبقاء الاسم في ملفاتهم`,
            { dependentsCount: total }
          );
        }
      }

      await school.destroy({ transaction });
      return total;
    });

    res.json({ success: true, message: "تم حذف المدرسة", affectedDependents: affected });
  } catch (error) {
    next(error);
  }
};

/**
 * Dependents may only be given a school from the list. A name that is already
 * on the dependent (typed before the list existed, or later removed from it)
 * is left alone, so old files can still be edited and saved.
 */
const assertSchoolAllowed = async (schoolName, currentName = null) => {
  if (schoolName === undefined || schoolName === null || schoolName === "") return;
  if (typeof schoolName !== "string") throw new ValidationError("اسم المدرسة غير صالح");
  if (currentName && schoolName.trim() === currentName.trim()) return;

  const listed = await School.findOne({ where: { name: schoolName.trim() } });
  if (!listed) throw new ValidationError("المدرسة غير موجودة في قائمة المدارس");
};

module.exports = {
  getSchools,
  createSchool,
  importUnlisted,
  updateSchool,
  deleteSchool,
  assertSchoolAllowed,
};
