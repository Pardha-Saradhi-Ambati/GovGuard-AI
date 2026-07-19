const express = require('express');
const router = express.Router();
const { getAlerts, updateAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.route('/')
  .get(getAlerts);

router.route('/:id')
  .put(updateAlert);

module.exports = router;
