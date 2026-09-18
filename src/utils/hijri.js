/**
 * Hijri (Umm al-Qura) date helpers.
 *
 * The database stores Gregorian dates only. Hijri is derived on output
 * (PDFs, Excel reports, messages) using the Umm al-Qura calendar built
 * into Node's Intl — no schema change and no extra dependency.
 */

const TIME_ZONE = "Asia/Riyadh";

const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsOf = (formatter, date) => {
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { year: get("year"), month: get("month"), day: get("day") };
};

const formatterFor = (calendar, timeZone) =>
  new Intl.DateTimeFormat(`en-u-ca-${calendar}-nu-latn`, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

// DATEONLY values are calendar dates (read as UTC so they never shift a day);
// timestamps are read in Riyadh local time.
const FORMATTERS = {
  hijri: {
    dateOnly: formatterFor("islamic-umalqura", "UTC"),
    timestamp: formatterFor("islamic-umalqura", TIME_ZONE),
  },
  gregorian: {
    dateOnly: formatterFor("gregory", "UTC"),
    timestamp: formatterFor("gregory", TIME_ZONE),
  },
};

/**
 * @param {string|Date|number} value "YYYY-MM-DD" or a timestamp
 * @returns {{year: string, month: string, day: string}|null} zero-padded parts
 */
const getParts = (value, calendar) => {
  if (!value) return null;
  const isDateOnly = typeof value === "string" && DATE_ONLY.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  const formatter = FORMATTERS[calendar][isDateOnly ? "dateOnly" : "timestamp"];
  return partsOf(formatter, date);
};

const join = (parts, order, separator) =>
  parts ? order.map((k) => parts[k]).join(separator) : "";

/** "1447-10-03" — sortable, for Excel columns */
const toHijriISO = (value) =>
  join(getParts(value, "hijri"), ["year", "month", "day"], "-");

/** "03/10/1447" */
const formatHijriNumeric = (value) =>
  join(getParts(value, "hijri"), ["day", "month", "year"], "/");

/** "22/03/2026" */
const formatGregorianNumeric = (value) =>
  join(getParts(value, "gregorian"), ["day", "month", "year"], "/");

/** "3 شوال 1447 هـ" */
const formatHijriLong = (value) => {
  const p = getParts(value, "hijri");
  if (!p) return "";
  return `${Number(p.day)} ${HIJRI_MONTHS[Number(p.month) - 1]} ${p.year} هـ`;
};

/** "03/10/1447 هـ - 22/03/2026 م" */
const formatDualDate = (value) => {
  const gregorian = formatGregorianNumeric(value);
  if (!gregorian) return "";
  const hijri = formatHijriNumeric(value);
  return hijri ? `${hijri} هـ - ${gregorian} م` : `${gregorian} م`;
};

/** "2026-03-22 15:45" in Riyadh time — for Excel timestamp columns */
const formatGregorianDateTime = (value) => {
  const p = getParts(value, "gregorian");
  if (!p) return "";
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
  return `${p.year}-${p.month}-${p.day} ${time}`;
};

module.exports = {
  HIJRI_MONTHS,
  toHijriISO,
  formatHijriNumeric,
  formatGregorianNumeric,
  formatHijriLong,
  formatDualDate,
  formatGregorianDateTime,
};
