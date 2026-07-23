const express = require('express');
const router = express.Router();
const { chatWithAssistant } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, chatWithAssistant);

module.exports = router;
