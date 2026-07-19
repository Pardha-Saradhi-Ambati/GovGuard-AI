const express = require('express');
const router = express.Router();
const {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} = require('../controllers/recordController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect); // Secure all routes

router.route('/')
  .get(getRecords)
  .post(createRecord);

router.route('/:id')
  .get(getRecordById)
  .put(updateRecord)
  .delete(authorizeRoles('Admin'), deleteRecord);

module.exports = router;
