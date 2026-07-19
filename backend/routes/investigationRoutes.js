const express = require('express');
const router = express.Router();
const {
  getInvestigations,
  getInvestigationById,
  updateInvestigationStatus,
  addInvestigationNote,
} = require('../controllers/investigationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.route('/')
  .get(getInvestigations);

router.route('/:id')
  .get(getInvestigationById);

router.route('/:id/status')
  .put(updateInvestigationStatus);

router.route('/:id/notes')
  .post(addInvestigationNote);

module.exports = router;
