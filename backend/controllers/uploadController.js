const fs = require('fs');
const csv = require('csv-parser');
const { query, pool } = require('../config/db');

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
      const riskScoreStr = row.risk_score || row.riskscore || '0';
      const fraudStatusRaw = row.fraud_status || row.fraudstatus || 'unflagged';
      const fraudReasonsStr = row.fraud_reasons || row.reasons || '';

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

      // 3. Insert record into PostgreSQL marked as Pending Analysis, Not Evaluated, NULL risk score
      const insertQuery = `
        INSERT INTO financial_records (
          record_number, department, vendor, invoice_number, payment_method,
          amount, purpose, date, status, risk_score, fraud_status, ai_status, fraud_reasons
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `;

      await query(insertQuery, [
        finalRecordNumber,
        department,
        vendor,
        invoice_number,
        payment_method,
        parsedAmount,
        purpose,
        formattedDate,
        status,
        null,               // Risk Score = NULL
        'Not Evaluated',    // Fraud Status = Not Evaluated
        'Pending Analysis', // AI Status = Pending Analysis
        []
      ]);

      importedCount++;
      // Note: Fraud alerts are NOT created automatically during CSV upload.
      // Alerts will only be generated after AI analysis module is executed.
    }

    // 4. Log to Import History table
    await query(
      `INSERT INTO import_history (file_name, upload_time, imported_records, duplicate_records, failed_records)
       VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)`,
      [req.file.originalname, importedCount, duplicatesCount, failedCount]
    );

    // 5. Return Summary Response
    res.status(200).json({
      success: true,
      imported: importedCount,
      duplicates: duplicatesCount,
      failed: failedCount,
      errors: errors
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
