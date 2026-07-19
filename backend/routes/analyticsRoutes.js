const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.get('/summary', getDashboardSummary);

module.exports = router;
