const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changePassword,
  adminResetPassword,
  updateProfile,
  getProfile,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permission');

// User's own profile routes (any authenticated user)
router.get('/me/profile', authenticate, getProfile);
router.put('/me/profile', authenticate, updateProfile);
router.post('/me/change-password', authenticate, changePassword);

// Admin routes
router.get('/', authenticate, hasPermission('view_users'), getUsers);
router.get('/:id', authenticate, hasPermission('view_users'), getUserById);
router.post('/', authenticate, hasPermission('create_user'), createUser);
router.put('/:id', authenticate, hasPermission('edit_user'), updateUser);
router.post('/:id/reset-password', authenticate, hasPermission('edit_user'), adminResetPassword);

module.exports = router;
