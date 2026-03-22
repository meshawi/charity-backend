const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permission');

router.get('/', authenticate, getCategories);
router.post('/', authenticate, hasPermission('manage_categories'), createCategory);
router.put('/:id', authenticate, hasPermission('manage_categories'), updateCategory);
router.delete('/:id', authenticate, hasPermission('manage_categories'), deleteCategory);

module.exports = router;
