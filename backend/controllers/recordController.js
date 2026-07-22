const { query } = require('../config/db');
const aiService = require('../services/aiService');

// @desc    Get all financial records (paginated with search & filters)
// @route   GET /api/records
// @access  Private
const getRecords = async (req, res, next) => {
  try {
    const {
      search,
      department,
      status,
      fraud_status,
      minRisk,
      maxRisk,
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let queryText = 'SELECT * FROM financial_records WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
      queryText += ` AND (
        record_number ILIKE $${paramIndex} OR 
        vendor ILIKE $${paramIndex} OR 
        invoice_number ILIKE $${paramIndex} OR 
        purpose ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Department filter
    if (department) {
      queryText += ` AND department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    // Status filter
    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Fraud status filter
    if (fraud_status) {
      queryText += ` AND fraud_status = $${paramIndex}`;
      params.push(fraud_status);
      paramIndex++;
    }

    // Risk score range
    if (minRisk) {
      queryText += ` AND risk_score >= $${paramIndex}`;
      params.push(parseInt(minRisk));
      paramIndex++;
    }
    if (maxRisk) {
      queryText += ` AND risk_score <= $${paramIndex}`;
      params.push(parseInt(maxRisk));
      paramIndex++;
    }

    // Get total count before pagination
    const countQueryText = queryText.replace('SELECT *', 'SELECT COUNT(*)');
    const countRes = await query(countQueryText, params);
    const totalRecords = parseInt(countRes.rows[0].count);

    // Sorting
    const validSortFields = ['date', 'amount', 'risk_score', 'record_number'];
    const actualSortBy = validSortFields.includes(sortBy) ? sortBy : 'date';
    const actualSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryText += ` ORDER BY ${actualSortBy} ${actualSortOrder}`;

    // Pagination
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit));
    params.push(offset);

    const recordsRes = await query(queryText, params);

    res.status(200).json({
      records: recordsRes.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRecords / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get record by ID
// @route   GET /api/records/:id
// @access  Private
const getRecordById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const recordRes = await query('SELECT * FROM financial_records WHERE id = $1', [id]);
    const record = recordRes.rows[0];

    if (!record) {
      res.status(404);
      return next(new Error('Financial record not found'));
    }

    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new financial record
// @route   POST /api/records
// @access  Private
const createRecord = async (req, res, next) => {
  const {
    department,
    vendor,
    invoice_number,
    payment_method,
    amount,
    purpose,
    date,
    status,
    risk_score = 0,
    fraud_status = 'unflagged',
    fraud_reasons = []
  } = req.body;

  if (!department || !vendor || !invoice_number || !payment_method || !amount || !purpose || !date || !status) {
    res.status(400);
    return next(new Error('Please fill in all required fields'));
  }

  try {
    // Generate new record number
    const countRes = await query('SELECT COUNT(*) FROM financial_records');
    const count = parseInt(countRes.rows[0].count) + 1;
    const record_number = `REC-2026-${String(count).padStart(4, '0')}`;

    // Insert record
    const insertQuery = `
      INSERT INTO financial_records (
        record_number, department, vendor, invoice_number, payment_method, 
        amount, purpose, date, status, risk_score, fraud_status, fraud_reasons, prediction, confidence, recommendation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    const recordRes = await query(insertQuery, [
      record_number,
      department,
      vendor,
      invoice_number,
      payment_method,
      amount,
      purpose,
      date,
      status,
      risk_score,
      fraud_status,
      JSON.stringify(fraud_reasons),
      'Not Evaluated',
      null,
      'No AI explanation available'
    ]);

    const newRecord = recordRes.rows[0];

    // Invoke AI Microservice
    const aiResult = await aiService.predictFraudRisk({
      record_number,
      department,
      vendor,
      invoice_number,
      payment_method,
      amount: parseFloat(amount),
      purpose,
      date,
      status,
    });

    if (aiResult) {
      const { risk_score: aiScore, prediction, confidence, reasons, recommendation } = aiResult;
      const isHighRisk = aiScore >= 70;
      const finalFraudStatus = isHighRisk ? 'flagged' : 'unflagged';
      const finalAiStatus = 'Completed';

      const updatedRes = await query(
        `UPDATE financial_records 
         SET risk_score = $1, fraud_status = $2, ai_status = $3, fraud_reasons = $4, prediction = $5, confidence = $6, recommendation = $7
         WHERE id = $8
         RETURNING *;`,
        [aiScore, finalFraudStatus, finalAiStatus, JSON.stringify(reasons), prediction, confidence, recommendation, newRecord.id]
      );

      const updatedRecord = updatedRes.rows[0];

      if (isHighRisk) {
        const alertRes = await query(
          `INSERT INTO fraud_alerts (financial_record_id, risk_score, reasons, prediction, confidence, recommendation, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'New')
           RETURNING id`,
          [updatedRecord.id, aiScore, JSON.stringify(reasons), prediction, confidence, recommendation]
        );

        const alertId = alertRes.rows[0].id;
        const caseCheck = await query('SELECT * FROM investigations WHERE fraud_alert_id = $1', [alertId]);
        if (caseCheck.rows.length === 0) {
          const initialNotes = [
            {
              author: 'AI Microservice Integration',
              text: `Investigation opened. Case auto-created from AI Anomaly Detection (${prediction}, Risk: ${aiScore}%, Confidence: ${confidence}%).`,
              timestamp: new Date().toISOString()
            }
          ];
          const aiSummary = `This transaction has been evaluated as ${prediction} with a statistical confidence level of ${confidence}%. The diagnostic models flagged the record due to the following specific anomalies: ${reasons.join(', ')}. The primary integrity recommendation is: ${recommendation}`;
          await query(
            'INSERT INTO investigations (fraud_alert_id, status, ai_summary, recommendation, case_notes) VALUES ($1, $2, $3, $4, $5)',
            [alertId, 'Open', aiSummary, recommendation, JSON.stringify(initialNotes)]
          );
        }
      }

      return res.status(201).json(updatedRecord);
    }

    res.status(201).json(newRecord);
  } catch (error) {
    next(error);
  }
};

// @desc    Update financial record
// @route   PUT /api/records/:id
// @access  Private
const updateRecord = async (req, res, next) => {
  const { id } = req.params;
  const {
    department,
    vendor,
    invoice_number,
    payment_method,
    amount,
    purpose,
    date,
    status,
    risk_score,
    fraud_status,
    fraud_reasons,
    prediction,
    confidence,
    recommendation
  } = req.body;

  try {
    const recordCheck = await query('SELECT * FROM financial_records WHERE id = $1', [id]);
    if (recordCheck.rows.length === 0) {
      res.status(404);
      return next(new Error('Financial record not found'));
    }

    const currentRecord = recordCheck.rows[0];

    const updateQuery = `
      UPDATE financial_records 
      SET 
        department = COALESCE($1, department),
        vendor = COALESCE($2, vendor),
        invoice_number = COALESCE($3, invoice_number),
        payment_method = COALESCE($4, payment_method),
        amount = COALESCE($5, amount),
        purpose = COALESCE($6, purpose),
        date = COALESCE($7, date),
        status = COALESCE($8, status),
        risk_score = COALESCE($9, risk_score),
        fraud_status = COALESCE($10, fraud_status),
        fraud_reasons = COALESCE($11, fraud_reasons),
        prediction = COALESCE($12, prediction),
        confidence = COALESCE($13, confidence),
        recommendation = COALESCE($14, recommendation)
      WHERE id = $15
      RETURNING *;
    `;

    const recordRes = await query(updateQuery, [
      department,
      vendor,
      invoice_number,
      payment_method,
      amount,
      purpose,
      date,
      status,
      risk_score,
      fraud_status,
      fraud_reasons ? JSON.stringify(fraud_reasons) : null,
      prediction,
      confidence,
      recommendation,
      id
    ]);

    const updatedRecord = recordRes.rows[0];

    // Handle alert lifecycle based on fraud_status changes
    if (updatedRecord.fraud_status === 'flagged' && currentRecord.fraud_status === 'unflagged') {
      // Check if an alert already exists
      const alertCheck = await query('SELECT * FROM fraud_alerts WHERE financial_record_id = $1', [id]);
      if (alertCheck.rows.length === 0) {
        await query(
          'INSERT INTO fraud_alerts (financial_record_id, risk_score, reasons, prediction, confidence, recommendation, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            id, 
            updatedRecord.risk_score, 
            JSON.stringify(updatedRecord.fraud_reasons || []), 
            updatedRecord.prediction || 'Not Evaluated',
            updatedRecord.confidence || null,
            updatedRecord.recommendation || 'No AI explanation available',
            'New'
          ]
        );
      }
    } else if (updatedRecord.fraud_status === 'unflagged' && currentRecord.fraud_status !== 'unflagged') {
      // If downgraded to unflagged, dismiss any active alerts/investigations or set alert to Dismissed
      await query("UPDATE fraud_alerts SET status = 'Dismissed' WHERE financial_record_id = $1", [id]);
    }

    res.status(200).json(updatedRecord);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete financial record
// @route   DELETE /api/records/:id
// @access  Private/Admin
const deleteRecord = async (req, res, next) => {
  const { id } = req.params;
  try {
    const recordCheck = await query('SELECT * FROM financial_records WHERE id = $1', [id]);
    if (recordCheck.rows.length === 0) {
      res.status(404);
      return next(new Error('Financial record not found'));
    }

    await query('DELETE FROM financial_records WHERE id = $1', [id]);
    res.status(200).json({ message: 'Financial record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
};
