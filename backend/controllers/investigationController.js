const { query } = require('../config/db');
const { createNotification } = require('../services/notificationService');

// @desc    Get all investigation cases (Admin sees all, Officers see their assigned cases)
// @route   GET /api/investigations
// @access  Private
const getInvestigations = async (req, res, next) => {
  try {
    let queryText = `
      SELECT 
        i.*,
        fa.risk_score, fa.reasons, fa.status AS alert_status, fa.prediction, fa.confidence,
        fr.record_number, fr.department, fr.vendor, fr.amount, fr.purpose, fr.date,
        u.username AS officer_username
      FROM investigations i
      JOIN fraud_alerts fa ON i.fraud_alert_id = fa.id
      JOIN financial_records fr ON fa.financial_record_id = fr.id
      LEFT JOIN users u ON i.officer_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If user is an Investigation Officer, limit to their assigned cases
    if (req.user.role === 'Investigation Officer') {
      queryText += ' AND i.officer_id = $1';
      params.push(req.user.id);
    }

    queryText += ' ORDER BY i.created_at DESC';

    const investigationsRes = await query(queryText, params);
    res.status(200).json(investigationsRes.rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Get investigation case by ID
// @route   GET /api/investigations/:id
// @access  Private
const getInvestigationById = async (req, res, next) => {
  const { id } = req.params;
  try {
    let queryText = `
      SELECT 
        i.*,
        fa.id AS alert_id, fa.risk_score, fa.reasons, fa.status AS alert_status, fa.notes AS alert_notes,
        fa.prediction, fa.confidence,
        fr.id AS financial_record_id, fr.record_number, fr.department, fr.vendor, fr.amount, fr.purpose, fr.date, fr.status AS record_status, fr.payment_method, fr.invoice_number,
        u.username AS officer_username, u.email AS officer_email
      FROM investigations i
      JOIN fraud_alerts fa ON i.fraud_alert_id = fa.id
      JOIN financial_records fr ON fa.financial_record_id = fr.id
      LEFT JOIN users u ON i.officer_id = u.id
      WHERE i.id = $1
    `;

    const caseRes = await query(queryText, [id]);
    const caseData = caseRes.rows[0];

    if (!caseData) {
      res.status(404);
      return next(new Error('Investigation case not found'));
    }

    // Role check: Officers can only view their own cases
    if (req.user.role === 'Investigation Officer' && caseData.officer_id !== req.user.id) {
      res.status(403);
      return next(new Error('Not authorized to access this investigation case'));
    }

    res.status(200).json(caseData);
  } catch (error) {
    next(error);
  }
};

// @desc    Update investigation status
// @route   PUT /api/investigations/:id/status
// @access  Private
const updateInvestigationStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // 'Open' or 'Closed'

  if (!status || !['Open', 'Closed'].includes(status)) {
    res.status(400);
    return next(new Error('Please provide a valid status: Open or Closed'));
  }

  try {
    const caseCheck = await query('SELECT * FROM investigations WHERE id = $1', [id]);
    if (caseCheck.rows.length === 0) {
      res.status(404);
      return next(new Error('Investigation case not found'));
    }

    const currentCase = caseCheck.rows[0];

    // Authorization check
    if (req.user.role === 'Investigation Officer' && currentCase.officer_id !== req.user.id) {
      res.status(403);
      return next(new Error('Not authorized to modify this investigation case'));
    }

    // Update case status
    const updateRes = await query(
      'UPDATE investigations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    const updatedCase = updateRes.rows[0];

    // Synchronize alert status and financial record status when investigation is closed
    if (status === 'Closed') {
      // Set alert status to Resolved
      await query("UPDATE fraud_alerts SET status = 'Resolved' WHERE id = $1", [updatedCase.fraud_alert_id]);
      
      // Update financial record: Set fraud status to 'resolved' and transaction status to 'Rejected'
      const alertRes = await query('SELECT financial_record_id FROM fraud_alerts WHERE id = $1', [updatedCase.fraud_alert_id]);
      if (alertRes.rows.length > 0) {
        const recordId = alertRes.rows[0].financial_record_id;
        await query(
          "UPDATE financial_records SET fraud_status = 'resolved', status = 'Rejected' WHERE id = $1",
          [recordId]
        );

        // Dispatch resolved notification
        const recordRes = await query('SELECT record_number FROM financial_records WHERE id = $1', [recordId]);
        const recordNumber = recordRes.rows[0]?.record_number || 'Unknown';

        createNotification({
          userId: updatedCase.officer_id || req.user.id,
          title: 'Investigation Case Resolved',
          message: `Investigation case on record ${recordNumber} has been marked resolved.`,
          type: 'resolved',
          priority: 'Low',
          referenceType: 'investigation',
          referenceId: id
        });
      }
    } else {
      // Reopened case
      await query("UPDATE fraud_alerts SET status = 'Under Investigation' WHERE id = $1", [updatedCase.fraud_alert_id]);
      const alertRes = await query('SELECT financial_record_id FROM fraud_alerts WHERE id = $1', [updatedCase.fraud_alert_id]);
      if (alertRes.rows.length > 0) {
        const recordId = alertRes.rows[0].financial_record_id;
        await query(
          "UPDATE financial_records SET fraud_status = 'investigating', status = 'Pending' WHERE id = $1",
          [recordId]
        );
      }
    }

    // Append standard logs to case_notes
    const logNote = {
      author: req.user.username,
      text: `Status updated to ${status}.`,
      timestamp: new Date().toISOString()
    };

    await query(
      'UPDATE investigations SET case_notes = case_notes || $1::jsonb WHERE id = $2',
      [JSON.stringify(logNote), id]
    );

    res.status(200).json(updatedCase);
  } catch (error) {
    next(error);
  }
};

// @desc    Add investigation case note
// @route   POST /api/investigations/:id/notes
// @access  Private
const addInvestigationNote = async (req, res, next) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text || text.trim() === '') {
    res.status(400);
    return next(new Error('Note content cannot be empty'));
  }

  try {
    const caseCheck = await query('SELECT * FROM investigations WHERE id = $1', [id]);
    if (caseCheck.rows.length === 0) {
      res.status(404);
      return next(new Error('Investigation case not found'));
    }

    const currentCase = caseCheck.rows[0];

    // Authorization check
    if (req.user.role === 'Investigation Officer' && currentCase.officer_id !== req.user.id) {
      res.status(403);
      return next(new Error('Not authorized to add notes to this case'));
    }

    const newNote = {
      author: req.user.username,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    const updateRes = await query(
      'UPDATE investigations SET case_notes = case_notes || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [JSON.stringify(newNote), id]
    );

    res.status(200).json(updateRes.rows[0]);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvestigations,
  getInvestigationById,
  updateInvestigationStatus,
  addInvestigationNote,
};
