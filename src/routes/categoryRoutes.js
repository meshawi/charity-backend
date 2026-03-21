const express = require('express');
const router = express.Router();
const { getCategories, getCategoryById, updateCategory } = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permission');

router.get('/', authenticate, getCategories);
router.get('/:id', authenticate, getCategoryById);
// Categories are seeded and fixed — no create or delete
// Only description and color can be updated (name is protected in controller)
router.put('/:id', authenticate, hasPermission('manage_categories'), updateCategory);

module.exports = router;
