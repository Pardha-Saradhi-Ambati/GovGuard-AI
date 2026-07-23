const express = require('express');
const router = express.Router();
const { login, getMe, getOfficers, googleLogin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.get('/officers', protect, getOfficers);

module.exports = router;
