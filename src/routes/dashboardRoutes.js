const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentActivity, getRecentProfiles, getDailyStats } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permission');

router.get('/stats', authenticate, hasPermission('view_dashboard'), getDashboardStats);
router.get('/activity', authenticate, hasPermission('view_dashboard'), getRecentActivity);
router.get('/recent-profiles', authenticate, hasPermission('view_dashboard'), getRecentProfiles);
router.get('/daily-stats', authenticate, hasPermission('view_dashboard'), getDailyStats);

module.exports = router;
