/**
 * Approved beneficiary files go back to the review queue when their data
 * changes, so the review committee always signs off on what is on file.
 */

// The form re-sends every field on save, with defaults filled in for empty
// ones ("" / 0 / false / {done: false}). Empty-ish values are dropped before
// comparing so saving without editing anything is not seen as a change.
const prune = (value) => {
  if (value === null || value === undefined || value === "" || value === false || value === 0 || value === "0") {
    return undefined;
  }
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const pruned = prune(value[key]);
      if (pruned !== undefined) result[key] = pruned;
    }
    return Object.keys(result).length ? result : undefined;
  }
  return String(value);
};

const isSameValue = (a, b) => JSON.stringify(prune(a)) === JSON.stringify(prune(b));

/** Names of the model fields in `changes` that really differ from the saved record */
const getChangedFields = (instance, changes) =>
  Object.keys(changes).filter(
    (key) => key in instance.constructor.rawAttributes && !isSameValue(instance.get(key), changes[key])
  );

/**
 * Move an approved file back to "pending_review".
 * @returns {Promise<boolean>} true if the status was changed
 */
const sendBackToReview = async (beneficiary) => {
  if (!beneficiary || beneficiary.status !== "approved") return false;
  await beneficiary.update({ status: "pending_review" });
  return true;
};

module.exports = { getChangedFields, sendBackToReview };
