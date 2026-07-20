const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { uploadCSV, getImportHistory } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure upload route

router.post('/csv', upload.single('file'), uploadCSV);
router.get('/history', getImportHistory);

module.exports = router;
