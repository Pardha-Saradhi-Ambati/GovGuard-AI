const { query } = require('../config/db');

// @desc    Get dashboard analytics summary
// @route   GET /api/analytics/summary
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    const isOfficer = req.user.role === 'Investigation Officer';
    const officerId = req.user.id;

    // --- 1. KPI Cards ---
    
    // Total Financial Records
    const totalRecordsRes = await query('SELECT COUNT(*)::int AS count FROM financial_records');
    const totalRecords = totalRecordsRes.rows[0].count;

    // High Risk Records (Risk Score >= 70)
    const highRiskRes = await query('SELECT COUNT(*)::int AS count FROM financial_records WHERE risk_score >= 70');
    const highRiskRecords = highRiskRes.rows[0].count;

    // Investigations (Assigned cases if officer, all if Admin)
    let investigationsCountQuery = 'SELECT COUNT(*)::int AS count FROM investigations';
    let investigationsCountParams = [];
    if (isOfficer) {
      investigationsCountQuery += ' WHERE officer_id = $1';
      investigationsCountParams.push(officerId);
    }
    const investigationsRes = await query(investigationsCountQuery, investigationsCountParams);
    const totalInvestigations = investigationsRes.rows[0].count;

    // Resolved Cases (Status = Closed)
    let resolvedCountQuery = "SELECT COUNT(*)::int AS count FROM investigations WHERE status = 'Closed'";
    let resolvedCountParams = [];
    if (isOfficer) {
      resolvedCountQuery += ' AND officer_id = $1';
      resolvedCountParams.push(officerId);
    }
    const resolvedRes = await query(resolvedCountQuery, resolvedCountParams);
    const resolvedCases = resolvedRes.rows[0].count;

    // Average Risk Score
    const avgRiskRes = await query('SELECT ROUND(AVG(risk_score))::int AS avg_score FROM financial_records');
    const averageRiskScore = avgRiskRes.rows[0].avg_score || 0;

    // --- 2. Chart Queries ---

    // A. Department-wise Fraud/High Risk records
    // Return count of high-risk transactions and total money at risk by department
    const deptFraudRes = await query(`
      SELECT 
        department,
        COUNT(*)::int AS total_records,
        COUNT(CASE WHEN risk_score >= 70 THEN 1 END)::int AS high_risk_count,
        SUM(CASE WHEN risk_score >= 70 THEN amount ELSE 0 END)::double precision AS risk_amount
      FROM financial_records
      GROUP BY department
      ORDER BY risk_amount DESC
    `);

    // B. Monthly Fraud Trend
    // Return risk transactions count and total flagged amount grouped by month
    const monthlyTrendRes = await query(`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') AS month_name,
        COUNT(*)::int AS total_records,
        COUNT(CASE WHEN risk_score >= 70 THEN 1 END)::int AS high_risk_count,
        SUM(CASE WHEN risk_score >= 70 THEN amount ELSE 0 END)::double precision AS risk_amount
      FROM financial_records
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month_name ASC
    `);

    // C. Risk Distribution Buckets
    // Return number of records in: Low (0-39), Medium (40-69), High (70-89), Critical (90-100)
    const riskDistributionRes = await query(`
      SELECT 
        CASE 
          WHEN risk_score < 40 THEN 'Low (0-39)'
          WHEN risk_score >= 40 AND risk_score < 70 THEN 'Medium (40-69)'
          WHEN risk_score >= 70 AND risk_score < 90 THEN 'High (70-89)'
          ELSE 'Critical (90-100)'
        END AS risk_tier,
        COUNT(*)::int AS count
      FROM financial_records
      GROUP BY 
        CASE 
          WHEN risk_score < 40 THEN 'Low (0-39)'
          WHEN risk_score >= 40 AND risk_score < 70 THEN 'Medium (40-69)'
          WHEN risk_score >= 70 AND risk_score < 90 THEN 'High (70-89)'
          ELSE 'Critical (90-100)'
        END
      ORDER BY 
        CASE 
          WHEN risk_tier = 'Low (0-39)' THEN 1
          WHEN risk_tier = 'Medium (40-69)' THEN 2
          WHEN risk_tier = 'High (70-89)' THEN 3
          ELSE 4
        END
    `);

    // D. Top Vendors by total amount flagged
    // Return top 5 vendors by sum of high risk invoice amounts
    const topVendorsRes = await query(`
      SELECT 
        vendor,
        COUNT(*)::int AS total_records,
        SUM(amount)::double precision AS total_amount,
        SUM(CASE WHEN risk_score >= 70 THEN amount ELSE 0 END)::double precision AS flagged_amount
      FROM financial_records
      GROUP BY vendor
      ORDER BY flagged_amount DESC, total_amount DESC
      LIMIT 5
    `);

    res.status(200).json({
      summary: {
        totalRecords,
        highRiskRecords,
        totalInvestigations,
        resolvedCases,
        averageRiskScore,
      },
      charts: {
        departmentFraud: deptFraudRes.rows,
        monthlyTrend: monthlyTrendRes.rows,
        riskDistribution: riskDistributionRes.rows,
        topVendors: topVendorsRes.rows,
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};
