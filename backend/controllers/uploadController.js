const fs = require('fs');
const csv = require('csv-parser');
const { query, pool } = require('../config/db');
const aiService = require('../services/aiService');
const { createNotification } = require('../services/notificationService');

// Helper to normalize header keys
const normalizeKey = (key) => {
  return key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
};

// @desc    Upload and parse CSV financial records
// @route   POST /api/upload/csv
// @access  Private
const uploadCSV = async (req, res, next) => {
  if (!req.file) {
    res.status(400);
    return next(new Error('Please upload a valid CSV file.'));
  }

  const filePath = req.file.path;
  const rawRows = [];
  const errors = [];
  let importedCount = 0;
  let duplicatesCount = 0;
  let failedCount = 0;
  let totalRiskScore = 0;
  let highRiskCount = 0;
  let aiAnalyzedCount = 0;

  try {
    // 1. Read and parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => rawRows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rawRows.length === 0) {
      res.status(400);
      return next(new Error('Uploaded CSV file is empty.'));
    }

    // Get current total count for generating record numbers if not provided
    const totalCountRes = await query('SELECT COUNT(*)::int AS count FROM financial_records');
    let currentRecordSeq = totalCountRes.rows[0].count;

    // Track seen record numbers within this batch
    const batchSeenRecordNumbers = new Set();

    // Fetch existing record_numbers from database for duplicate checking
    const existingDbRecordsRes = await query('SELECT record_number FROM financial_records');
    const existingDbRecordNumbers = new Set(existingDbRecordsRes.rows.map(r => r.record_number));

    // 2. Validate and process each row
    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      const rawRow = rawRows[i];

      // Normalize row keys
      const row = {};
      Object.keys(rawRow).forEach((key) => {
        row[normalizeKey(key)] = rawRow[key] ? rawRow[key].trim() : '';
      });

      // Extract fields with fallbacks
      const record_id = row.record_id || row.record_number || row.id || '';
      const department = row.department || row.dept || '';
      const vendor = row.vendor || row.vendor_name || '';
      const invoice_number = row.invoice_number || row.invoicenumber || row.invoice || '';
      const payment_method = row.payment_method || row.paymentmethod || 'Direct Bank Transfer';
      const amountStr = row.amount || row.disbursement_amount || '';
      const purpose = row.purpose || row.description || '';
      const dateStr = row.date || row.transaction_date || '';
      const statusRaw = row.status || row.approval_status || 'Pending';

      // Validation 1: Required columns
      const missingFields = [];
      if (!department) missingFields.push('department');
      if (!vendor) missingFields.push('vendor');
      if (!invoice_number) missingFields.push('invoice_number');
      if (!amountStr) missingFields.push('amount');
      if (!purpose) missingFields.push('purpose');
      if (!dateStr) missingFields.push('date');

      if (missingFields.length > 0) {
        failedCount++;
        errors.push(`Row ${rowNum}: Missing required field(s): ${missingFields.join(', ')}`);
        continue;
      }

      // Validation 2: Numeric amount
      const parsedAmount = parseFloat(amountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        failedCount++;
        errors.push(`Row ${rowNum}: Invalid numeric amount '${amountStr}'`);
        continue;
      }

      // Validation 3: Valid date
      const parsedDate = Date.parse(dateStr);
      if (isNaN(parsedDate)) {
        failedCount++;
        errors.push(`Row ${rowNum}: Invalid date format '${dateStr}'`);
        continue;
      }
      const formattedDate = new Date(parsedDate).toISOString().split('T')[0];

      // Validation 4: Duplicate record_id / record_number
      if (record_id) {
        if (existingDbRecordNumbers.has(record_id) || batchSeenRecordNumbers.has(record_id)) {
          duplicatesCount++;
          errors.push(`Row ${rowNum}: Duplicate record_id '${record_id}'`);
          continue;
        }
      }

      // Generate record_number if not provided
      let finalRecordNumber = record_id;
      if (!finalRecordNumber) {
        currentRecordSeq++;
        finalRecordNumber = `REC-2026-${String(currentRecordSeq).padStart(4, '0')}`;
        // Ensure auto-generated record_number isn't already taken
        while (existingDbRecordNumbers.has(finalRecordNumber) || batchSeenRecordNumbers.has(finalRecordNumber)) {
          currentRecordSeq++;
          finalRecordNumber = `REC-2026-${String(currentRecordSeq).padStart(4, '0')}`;
        }
      }

      // Track as seen in batch
      batchSeenRecordNumbers.add(finalRecordNumber);

      // Sanitize status
      const validStatuses = ['Pending', 'Approved', 'Rejected'];
      const status = validStatuses.find(s => s.toLowerCase() === statusRaw.toLowerCase()) || 'Pending';

      // 3. Initial insertion into PostgreSQL
      const insertQuery = `
        INSERT INTO financial_records (
          record_number, department, vendor, invoice_number, payment_method,
          amount, purpose, date, status, risk_score, fraud_status, ai_status, fraud_reasons, prediction, confidence, recommendation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
      `;

      const insertRes = await query(insertQuery, [
        finalRecordNumber,
        department,
        vendor,
        invoice_number,
        payment_method,
        parsedAmount,
        purpose,
        formattedDate,
        status,
        null,               // Default Risk Score = NULL
        'Not Evaluated',    // Default Fraud Status = Not Evaluated
        'Pending',          // Default AI Status = Pending
        '[]',               // Default fraud_reasons = [] (JSONB)
        'Not Evaluated',
        null,
        'No AI explanation available'
      ]);

      const insertedRecord = insertRes.rows[0];
      importedCount++;

      // 4. Automatically invoke AI Microservice (predictFraudRisk)
      const aiResult = await aiService.predictFraudRisk({
        record_number: finalRecordNumber,
        department,
        vendor,
        invoice_number,
        payment_method,
        amount: parsedAmount,
        purpose,
        date: formattedDate,
        status,
      });

      if (aiResult) {
        const { risk_score, prediction, confidence, reasons, recommendation } = aiResult;
        const isHighRisk = risk_score >= 70;
        const fraudStatus = isHighRisk ? 'flagged' : 'unflagged';
        const aiStatus = 'Completed';

        // Update financial_records with AI prediction output
        await query(
          `UPDATE financial_records 
           SET risk_score = $1, fraud_status = $2, ai_status = $3, fraud_reasons = $4, prediction = $5, confidence = $6, recommendation = $7
           WHERE id = $8`,
          [risk_score, fraudStatus, aiStatus, JSON.stringify(reasons), prediction, confidence, recommendation, insertedRecord.id]
        );

        aiAnalyzedCount++;
        totalRiskScore += risk_score;
        if (isHighRisk) highRiskCount++;

        // Trigger AI analysis complete notification
        createNotification({
          userId: req.user.id,
          title: 'AI Analysis Completed',
          message: `AI diagnostic run finished for record ${finalRecordNumber}.`,
          type: 'ai_analysis',
          priority: 'Low',
          referenceType: 'record',
          referenceId: insertedRecord.id
        });

        // If High Risk (risk_score >= 70), automatically create Fraud Alert and Investigation Case
        if (isHighRisk) {
          const alertRes = await query(
            `INSERT INTO fraud_alerts (financial_record_id, risk_score, reasons, prediction, confidence, recommendation, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'New')
             RETURNING id`,
            [insertedRecord.id, risk_score, JSON.stringify(reasons), prediction, confidence, recommendation]
          );

          const alertId = alertRes.rows[0].id;

          // Dispatch high risk and alert notifications
          createNotification({
            title: 'High Risk Transaction Detected',
            message: `Record ${finalRecordNumber} flagged with risk score of ${risk_score}%.`,
            type: 'high_risk',
            priority: 'Critical',
            referenceType: 'record',
            referenceId: insertedRecord.id
          });

          createNotification({
            title: 'Fraud Alert Created',
            message: `New fraud alert generated for record ${finalRecordNumber}.`,
            type: 'alert',
            priority: 'High',
            referenceType: 'alert',
            referenceId: alertId
          });

          // Auto-create Investigation Case if one does not exist
          const caseCheck = await query('SELECT * FROM investigations WHERE fraud_alert_id = $1', [alertId]);
          if (caseCheck.rows.length === 0) {
            const initialNotes = [
              {
                author: 'AI Microservice Integration',
                text: `Investigation opened. Case auto-created from AI Anomaly Detection (${prediction}, Risk: ${risk_score}%, Confidence: ${confidence}%).`,
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
      }
    }

    // 5. Log to Import History table
    await query(
      `INSERT INTO import_history (file_name, upload_time, imported_records, duplicate_records, failed_records)
       VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)`,
      [req.file.originalname, importedCount, duplicatesCount, failedCount]
    );

    // Trigger CSV Import complete notification
    createNotification({
      userId: req.user.id,
      title: 'CSV Upload Completed',
      message: `Successfully imported ${importedCount} records from ${req.file.originalname}.`,
      type: 'upload',
      priority: 'Low'
    });

    // 6. Return Summary Response
    const averageRiskScore = aiAnalyzedCount > 0 ? Math.round(totalRiskScore / aiAnalyzedCount) : 0;
    const aiCompleted = aiAnalyzedCount > 0;

    res.status(200).json({
      success: true,
      imported: importedCount,
      duplicates: duplicatesCount,
      failed: failedCount,
      averageRiskScore,
      highRiskCount,
      aiCompleted,
      errors
    });

  } catch (error) {
    next(error);
  } finally {
    // Delete temporary file after processing
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to remove temporary file:', filePath, err);
      }
    }
  }
};

// @desc    Get CSV import history logs
// @route   GET /api/upload/history
// @access  Private
const getImportHistory = async (req, res, next) => {
  try {
    const historyRes = await query('SELECT * FROM import_history ORDER BY upload_time DESC LIMIT 50');
    res.status(200).json(historyRes.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadCSV,
  getImportHistory,
};
