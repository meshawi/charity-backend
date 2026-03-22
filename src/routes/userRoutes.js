const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  updateUser,
  changePassword,
  adminResetPassword,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permission');

// User's own routes (any authenticated user)
router.post('/me/change-password', authenticate, changePassword);

// Admin routes
router.get('/', authenticate, hasPermission('view_users'), getUsers);
router.post('/', authenticate, hasPermission('create_user'), createUser);

router.put('/:id', authenticate, hasPermission('edit_user'), updateUser);
router.post('/:id/reset-password', authenticate, hasPermission('edit_user'), adminResetPassword);

module.exports = router;
