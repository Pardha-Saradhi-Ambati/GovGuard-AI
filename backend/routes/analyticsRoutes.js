const express = require('express');
const router = express.Router();
const { getDashboardSummary, getReports } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.get('/summary', getDashboardSummary);
router.get('/reports', getReports);

module.exports = router;
