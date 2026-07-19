const { query } = require('../config/db');

// @desc    Get all fraud alerts (with joined financial record details)
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res, next) => {
  try {
    const { status, minRisk } = req.query;
    
    let queryText = `
      SELECT 
        fa.*, 
        fr.record_number, fr.department, fr.vendor, fr.amount, fr.purpose, fr.date, fr.status AS record_status,
        u.username AS officer_username,
        i.id AS investigation_id
      FROM fraud_alerts fa
      JOIN financial_records fr ON fa.financial_record_id = fr.id
      LEFT JOIN users u ON fa.assigned_officer = u.id
      LEFT JOIN investigations i ON i.fraud_alert_id = fa.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND fa.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (minRisk) {
      queryText += ` AND fa.risk_score >= $${paramIndex}`;
      params.push(parseInt(minRisk));
      paramIndex++;
    }

    queryText += ' ORDER BY fa.risk_score DESC, fa.created_at DESC';

    const alertsRes = await query(queryText, params);

    res.status(200).json(alertsRes.rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Update alert status / assign officer
// @route   PUT /api/alerts/:id
// @access  Private
const updateAlert = async (req, res, next) => {
  const { id } = req.params;
  const { status, assigned_officer, notes } = req.body;

  try {
    // Check if alert exists
    const alertRes = await query('SELECT * FROM fraud_alerts WHERE id = $1', [id]);
    if (alertRes.rows.length === 0) {
      res.status(404);
      return next(new Error('Fraud alert not found'));
    }

    const currentAlert = alertRes.rows[0];

    const updateQuery = `
      UPDATE fraud_alerts 
      SET 
        status = COALESCE($1, status),
        assigned_officer = COALESCE($2, assigned_officer),
        notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *;
    `;

    // Handle assigned_officer casting if it's passed as null/undefined explicitly or empty string
    const targetOfficer = (assigned_officer === '' || assigned_officer === null) ? null : assigned_officer;

    const updatedRes = await query(updateQuery, [
      status,
      targetOfficer,
      notes,
      id
    ]);

    const updatedAlert = updatedRes.rows[0];

    // Keep financial_record fraud_status in sync with alert status
    let recordFraudStatus = 'flagged';
    if (updatedAlert.status === 'Under Investigation') {
      recordFraudStatus = 'investigating';
    } else if (updatedAlert.status === 'Resolved') {
      recordFraudStatus = 'resolved';
    } else if (updatedAlert.status === 'Dismissed') {
      recordFraudStatus = 'unflagged';
    }

    await query('UPDATE financial_records SET fraud_status = $1 WHERE id = $2', [
      recordFraudStatus,
      updatedAlert.financial_record_id
    ]);

    // If alert status changes to 'Under Investigation', auto-create an Investigation Case if one doesn't exist
    if (updatedAlert.status === 'Under Investigation') {
      const caseCheck = await query('SELECT * FROM investigations WHERE fraud_alert_id = $1', [id]);
      if (caseCheck.rows.length === 0) {
        const officerId = updatedAlert.assigned_officer || req.user.id;
        
        // Ensure assigned_officer is updated if it wasn't set yet
        if (!updatedAlert.assigned_officer) {
          await query('UPDATE fraud_alerts SET assigned_officer = $1 WHERE id = $2', [officerId, id]);
          updatedAlert.assigned_officer = officerId;
        }

        const initialNotes = [
          {
            author: 'System Audit',
            text: `Investigation opened. Case auto-created for officer ID ${officerId}.`,
            timestamp: new Date().toISOString()
          }
        ];

        const aiSummary = `This investigation is opened in response to fraud alert (Alert ID: ${id}) on record ${updatedAlert.financial_record_id}. Key anomalies detected include risk-score flag of ${updatedAlert.risk_score} due to reasons: ${updatedAlert.reasons.join(', ')}. Initial audit recommendations: verify legitimacy of vendor registration status, request original ledger logs, and confirm secondary manager authorizations.`;

        await query(
          'INSERT INTO investigations (fraud_alert_id, officer_id, status, ai_summary, case_notes) VALUES ($1, $2, $3, $4, $5)',
          [id, officerId, 'Open', aiSummary, JSON.stringify(initialNotes)]
        );
      }
    }

    res.status(200).json(updatedAlert);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  updateAlert,
};
