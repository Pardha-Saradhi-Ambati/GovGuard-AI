const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const { pool } = require('../config/db');

async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME || 'fraud_intelligence';
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // Connect to default database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    
    // Check if the database exists
    const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (checkRes.rows.length === 0) {
      console.log(`Database '${dbName}' does not exist. Creating it now...`);
      // CREATE DATABASE cannot be executed in a transaction, but running it directly on client is fine
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database '${dbName}' created successfully.`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }
  } catch (err) {
    console.error('Warning: Error checking/creating database. Assured existence not guaranteed:', err.message);
  } finally {
    await client.end();
  }
}

async function runSeed() {
  console.log('Starting Database Seeding...');
  
  // Ensure the database exists before doing anything else
  await ensureDatabaseExists();
  
  try {
    // 1. Read and execute schema.sql
    console.log('Reading and running schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema initialized.');

    // 2. Hash passwords
    console.log('Hashing passwords...');
    const adminPasswordHash = await bcrypt.hash('AdminGovSecure2026!', 10);
    const officer1PasswordHash = await bcrypt.hash('OfficerSecure2026!', 10);
    const officer2PasswordHash = await bcrypt.hash('OfficerSecure2026!', 10);

    // 3. Seed Users
    console.log('Inserting seeded users...');
    const userInsertQuery = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, role;
    `;
    
    const adminRes = await pool.query(userInsertQuery, ['admin', 'admin@gov.in', adminPasswordHash, 'Admin']);
    const officer1Res = await pool.query(userInsertQuery, ['officer1', 'officer1@gov.in', officer1PasswordHash, 'Investigation Officer']);
    const officer2Res = await pool.query(userInsertQuery, ['officer2', 'officer2@gov.in', officer2PasswordHash, 'Investigation Officer']);
    
    const adminId = adminRes.rows[0].id;
    const officer1Id = officer1Res.rows[0].id;
    const officer2Id = officer2Res.rows[0].id;
    
    console.log(`Users seeded successfully: Admin ID: ${adminId}, Officer1 ID: ${officer1Id}, Officer2 ID: ${officer2Id}`);

    // 4. Generate 100 Financial Records
    console.log('Generating 100 financial records...');
    const records = [];
    const departments = [
      'Department of Urban Development',
      'Department of Welfare and Social Justice',
      'Department of Information Technology',
      'Department of Public Works (PWD)',
      'Department of Health & Family Welfare',
      'Department of Agriculture and Rural Cooperatives'
    ];

    const standardVendors = [
      'Apex Infrastructure Solutions', 'Synergy Global Consulting', 'TechnoCore IT Systems',
      'Greenfield Construction Group', 'National Welfare Distribution Corp', 'SecureCom Systems Ltd',
      'AeroSpace Logistics India', 'Pioneer Medical Supplies', 'Global Smart Utilities',
      'Indo-Steel Projects', 'Alpha Facility Management', 'Reliable Office Products'
    ];

    const suspiciousVendors = [
      'Shell Enterprise Ltd', 'Phantom Logistics LLC', 'QuickCash Consultancy', 
      'Apex Horizon (Double Invoiced)', 'Direct Global Inc (No License)'
    ];

    const paymentMethods = ['Direct Bank Transfer', 'Electronic Fund Transfer (EFT)', 'Cheque', 'UPI / IMPS', 'Treasury Voucher'];
    
    const categories = ['Procurement', 'Welfare scheme', 'Grants', 'Vendor payments', 'Reimbursements'];

    // Let's generate records from Jan 2026 to July 2026
    const baseDate = new Date(2026, 0, 1);

    for (let i = 1; i <= 100; i++) {
      const recordNumber = `REC-2026-${String(i).padStart(4, '0')}`;
      const department = departments[Math.floor(Math.random() * departments.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      let vendor = standardVendors[Math.floor(Math.random() * standardVendors.length)];
      let amount = parseFloat((Math.random() * 850000 + 15000).toFixed(2)); // Regular amount 15k to 865k
      let purpose = `Procurement of services/supplies for ${department.toLowerCase()}`;
      let invoiceNumber = `INV-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`;
      
      // Let's simulate anomalies (Risk and Fraud patterns)
      let riskScore = Math.floor(Math.random() * 40); // Standard risk score below 40
      let fraudStatus = 'unflagged';
      let fraudReasons = [];
      let status = 'Approved';

      // 18% of records will be flagged as suspicious (risk_score >= 70)
      const isSuspicious = (i % 6 === 0);
      if (isSuspicious) {
        riskScore = Math.floor(Math.random() * 26) + 75; // 75 to 100
        fraudStatus = 'flagged';
        vendor = suspiciousVendors[Math.floor(Math.random() * suspiciousVendors.length)];
        
        // Add specific reasons
        if (riskScore > 90) {
          amount = parseFloat((Math.random() * 4000000 + 1200000).toFixed(2)); // High amount deviation (1.2M to 5.2M)
          fraudReasons.push('Extremely high invoice amount deviating from category standard');
        }
        if (vendor.includes('Shell') || vendor.includes('Phantom')) {
          fraudReasons.push('Vendor flagged on national shell company blacklist registry');
        }
        if (i % 12 === 0) {
          fraudReasons.push('Duplicate invoice matching transaction id or number in consecutive weeks');
          amount = 450000.00; // Force duplicate amount
          invoiceNumber = 'INV-2026-DUP999';
        } else {
          invoiceNumber = `INV-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`;
        }
        
        if (category === 'Welfare scheme') {
          purpose = 'Disbursement of welfare funds to unverified community list';
          fraudReasons.push('Direct benefits transfer sent to invalid or duplicate Aadhaar/Identity mappings');
        } else if (category === 'Grants') {
          purpose = 'Disaster Relief Infrastructural development grant';
          fraudReasons.push('Grant allocation approved outside regulatory bidding procedures');
        } else {
          purpose = `Emergency invoice validation for project oversight at ${department}`;
        }
        
        status = Math.random() > 0.4 ? 'Pending' : 'Rejected';
      } else {
        // Standard normal records
        if (category === 'Welfare scheme') {
          purpose = `Monthly disbursement under Social Security Pension scheme in ${department}`;
          amount = parseFloat((Math.random() * 120000 + 5000).toFixed(2));
        } else if (category === 'Grants') {
          purpose = `State sponsored R&D development grant for sustainable local agricultural practices`;
          amount = parseFloat((Math.random() * 500000 + 50000).toFixed(2));
        } else if (category === 'Reimbursements') {
          purpose = `Officer travel and administrative expense reimbursement`;
          amount = parseFloat((Math.random() * 8000 + 500).toFixed(2));
        }
        
        status = Math.random() > 0.05 ? 'Approved' : 'Pending';
      }

      // Date spread evenly over 200 days starting from Jan 1, 2026
      const date = new Date(baseDate.getTime() + (i * 2 * 24 * 60 * 60 * 1000));

      records.push({
        recordNumber,
        department,
        vendor,
        invoiceNumber,
        paymentMethod,
        amount,
        purpose,
        date,
        status,
        riskScore,
        fraudStatus,
        fraudReasons
      });
    }

    // Insert records
    console.log('Inserting records into financial_records table...');
    const recordInsertQuery = `
      INSERT INTO financial_records (
        record_number, department, vendor, invoice_number, payment_method, 
        amount, purpose, date, status, risk_score, fraud_status, fraud_reasons
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, record_number, risk_score, fraud_status, fraud_reasons;
    `;

    const insertedRecords = [];
    for (const rec of records) {
      const res = await pool.query(recordInsertQuery, [
        rec.recordNumber,
        rec.department,
        rec.vendor,
        rec.invoiceNumber,
        rec.paymentMethod,
        rec.amount,
        rec.purpose,
        rec.date,
        rec.status,
        rec.riskScore,
        rec.fraudStatus,
        rec.fraudReasons
      ]);
      insertedRecords.push(res.rows[0]);
    }
    console.log(`Successfully seeded ${insertedRecords.length} financial records.`);

    // 5. Create Fraud Alerts for Flagged Records
    console.log('Generating Fraud Alerts for flagged records...');
    const flaggedRecords = insertedRecords.filter(r => r.fraud_status === 'flagged');
    const alertInsertQuery = `
      INSERT INTO fraud_alerts (financial_record_id, risk_score, reasons, status, assigned_officer, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, financial_record_id, status;
    `;

    const insertedAlerts = [];
    for (let idx = 0; idx < flaggedRecords.length; idx++) {
      const record = flaggedRecords[idx];
      
      // Determine status
      // We will assign a few to officers to simulate ongoing investigations
      let alertStatus = 'New';
      let officerId = null;
      let notes = '';

      if (idx % 3 === 0) {
        alertStatus = 'Under Investigation';
        officerId = officer1Id;
        notes = 'Assigned for initial inspection of vendor registry and invoices.';
      } else if (idx % 3 === 1) {
        alertStatus = 'Resolved';
        officerId = officer2Id;
        notes = 'Investigation finalized. Recovered overpaid funds. Record adjusted.';
      } else if (idx % 3 === 2) {
        alertStatus = 'New';
        officerId = null;
        notes = 'Pending officer assignment.';
      }

      const res = await pool.query(alertInsertQuery, [
        record.id,
        record.risk_score,
        record.fraud_reasons,
        alertStatus,
        officerId,
        notes
      ]);
      insertedAlerts.push(res.rows[0]);

      // Update financial record's status to reflect alert state if Under Investigation
      if (alertStatus === 'Under Investigation') {
        await pool.query('UPDATE financial_records SET fraud_status = $1 WHERE id = $2', ['investigating', record.id]);
      } else if (alertStatus === 'Resolved') {
        await pool.query('UPDATE financial_records SET fraud_status = $1, status = $2 WHERE id = $3', ['resolved', 'Rejected', record.id]);
      }
    }
    console.log(`Successfully seeded ${insertedAlerts.length} fraud alerts.`);

    // 6. Create Investigation entries for alerts that are Under Investigation or Resolved
    console.log('Generating Investigation cases...');
    const investigationInsertQuery = `
      INSERT INTO investigations (fraud_alert_id, officer_id, status, ai_summary, case_notes)
      VALUES ($1, $2, $3, $4, $5);
    `;

    const activeOrResolvedAlerts = insertedAlerts.filter(a => a.status === 'Under Investigation' || a.status === 'Resolved');
    
    for (let idx = 0; idx < activeOrResolvedAlerts.length; idx++) {
      const alert = activeOrResolvedAlerts[idx];
      const status = alert.status === 'Resolved' ? 'Closed' : 'Open';
      const officerId = idx % 2 === 0 ? officer1Id : officer2Id;
      
      const aiSummary = `This investigation case centers around high risk patterns identified in record ID: ${alert.financial_record_id}. The AI engine (prepared for deployment) detected key anomalies including unusual vendor association and invoice amount deviations from standard departmental averages. Direct banking pathways are flagged. Recommendations: Perform deep review of procurement approvals and request vendor verification documentation from local registrar.`;

      const caseNotes = [
        {
          author: 'System Audit',
          text: 'Alert auto-generated and flagged for priority review based on risk score.',
          timestamp: new Date(2026, 6, 1).toISOString()
        },
        {
          author: officerId === officer1Id ? 'officer1' : 'officer2',
          text: status === 'Closed' ? 'Contacted vendor. Vendor failed to verify address. Suspect shell operation. Recommended rejecting invoice.' : 'Initial case verification started. Contacting procurement department for backup invoices.',
          timestamp: new Date(2026, 6, 2).toISOString()
        }
      ];

      if (status === 'Closed') {
        caseNotes.push({
          author: 'admin',
          text: 'Audit committee approved recommendation. Case closed and transaction set to Rejected.',
          timestamp: new Date(2026, 6, 5).toISOString()
        });
      }

      await pool.query(investigationInsertQuery, [
        alert.id,
        officerId,
        status,
        aiSummary,
        JSON.stringify(caseNotes)
      ]);
    }
    console.log('Successfully seeded investigations.');
    console.log('Database Seeding Complete!');
    
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    // Release pool
    await pool.end();
  }
}

// If run directly
if (require.main === module) {
  runSeed();
}

module.exports = runSeed;
