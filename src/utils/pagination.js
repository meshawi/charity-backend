/**
 * Build a standard pagination response object
 */
const buildPagination = (total, page, limit) => ({
  total,
  page: parseInt(page),
  limit: parseInt(limit),
  totalPages: Math.ceil(total / parseInt(limit)),
});

module.exports = { buildPagination };
