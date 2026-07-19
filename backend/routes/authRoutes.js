const express = require('express');
const router = express.Router();
const { login, getMe, getOfficers } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/officers', protect, getOfficers);

module.exports = router;
