const { query } = require('../config/db');
const { systemPrompt } = require('../config/chatPrompts');
const axios = require('axios');

/**
 * Searches the database for relevant context based on user message keywords.
 */
const getChatContext = async (message) => {
  let context = '';
  
  // 1. Check for Investigation ID pattern: e.g. "Investigation #12" or "Investigation 12"
  const invMatch = message.match(/investigation\s*#?\s*(\d+)/i) || message.match(/case\s*#?\s*(\d+)/i);
  if (invMatch) {
    const invId = parseInt(invMatch[1]);
    try {
      const invRes = await query(
        `SELECT i.*, fr.record_number, fr.vendor, fr.amount, fr.purpose, fr.date, fa.reasons, fa.recommendation, u.username as officer_name 
         FROM investigations i 
         JOIN fraud_alerts fa ON i.fraud_alert_id = fa.id 
         JOIN financial_records fr ON fa.financial_record_id = fr.id 
         LEFT JOIN users u ON i.officer_id = u.id
         WHERE i.id = $1`,
        [invId]
      );
      if (invRes.rows.length > 0) {
        return `Investigation Case Details: ${JSON.stringify(invRes.rows[0], null, 2)}`;
      }
    } catch (e) {
      console.error('[Chat Service] Error querying investigation details:', e);
    }
  }

  // 2. Check for Invoice Pattern: e.g. "INV-102"
  const invNumMatch = message.match(/INV-\w+/i);
  if (invNumMatch) {
    const invoiceNum = invNumMatch[0];
    try {
      const recRes = await query('SELECT * FROM financial_records WHERE invoice_number ILIKE $1', [`%${invoiceNum}%`]);
      if (recRes.rows.length > 0) {
        return `Financial Record by Invoice Number (${invoiceNum}): ${JSON.stringify(recRes.rows, null, 2)}`;
      }
    } catch (e) {
      console.error('[Chat Service] Error querying financial record by invoice:', e);
    }
  }

  // 3. Check for Record Pattern: e.g. "REC-2026-0101"
  const recNumMatch = message.match(/REC-\d{4}-\d+/i);
  if (recNumMatch) {
    const recordNum = recNumMatch[0];
    try {
      const recRes = await query('SELECT * FROM financial_records WHERE record_number ILIKE $1', [`%${recordNum}%`]);
      if (recRes.rows.length > 0) {
        return `Financial Record by Record Number (${recordNum}): ${JSON.stringify(recRes.rows, null, 2)}`;
      }
    } catch (e) {
      console.error('[Chat Service] Error querying financial record by record number:', e);
    }
  }

  // 4. Default: Fetch system KPIs
  try {
    const recordStats = await query(
      `SELECT COUNT(*) as total_records, 
              COUNT(CASE WHEN risk_score >= 70 THEN 1 END) as high_risk_records, 
              COALESCE(ROUND(AVG(risk_score)), 0) as avg_risk_score 
       FROM financial_records`
    );
    
    const caseStats = await query(
      `SELECT COUNT(*) as total_cases, 
              COUNT(CASE WHEN status='Open' THEN 1 END) as open_cases 
       FROM investigations`
    );

    const deptStats = await query(
      `SELECT department, 
              COUNT(CASE WHEN risk_score >= 70 THEN 1 END) as high_risk_count, 
              COALESCE(ROUND(AVG(risk_score)), 0) as avg_risk 
       FROM financial_records 
       GROUP BY department 
       ORDER BY avg_risk DESC`
    );

    const recentAlerts = await query(
      `SELECT fa.id, fa.risk_score, fr.record_number, fr.vendor, fr.amount, fr.department, fa.status 
       FROM fraud_alerts fa 
       JOIN financial_records fr ON fa.financial_record_id = fr.id 
       ORDER BY fa.created_at DESC 
       LIMIT 5`
    );

    const recentNotifications = await query(
      `SELECT title, message, priority, created_at 
       FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    context = `
System Statistics:
- Total Financial Records: ${recordStats.rows[0].total_records}
- High Risk Records (Risk >= 70%): ${recordStats.rows[0].high_risk_records}
- Platform Average Risk Score: ${recordStats.rows[0].avg_risk_score}%
- Total Investigation Cases: ${caseStats.rows[0].total_cases}
- Active Open Investigations: ${caseStats.rows[0].open_cases}

Department Anomaly Distribution:
${deptStats.rows.map(d => `- ${d.department}: ${d.high_risk_count} high-risk alerts (Avg risk: ${d.avg_risk}%)`).join('\n')}

Recent Fraud Alerts:
${recentAlerts.rows.map(a => `- Alert #${a.id} on Record ${a.record_number} (${a.vendor}, amount: INR ${a.amount}): Risk ${a.risk_score}% | Status: ${a.status}`).join('\n')}

Latest System Notifications:
${recentNotifications.rows.map(n => `- [${n.priority}] ${n.title}: ${n.message}`).join('\n')}
    `;
  } catch (e) {
    console.error('[Chat Service] Error building general system statistics context:', e);
    context = 'System statistics context unavailable.';
  }

  return context;
};

/**
 * Rules-based backup assistant response generator.
 */
const generateLocalResponse = (message, context) => {
  const isHelpQuery = /explain|mean|score|isolation|forest/i.test(message);
  
  if (isHelpQuery) {
    if (/isolation/i.test(message)) {
      return `### Isolation Forest Anomaly Detection
The **Isolation Forest** is an unsupervised machine learning algorithm used to flag transaction outliers.
- Unlike traditional methods that define "normal" data profiles, Isolation Forest isolates anomalies directly.
- It recursively partitions dataset records. Because anomalies require far fewer partitions to isolate (shorter path lengths in the trees), they are classified as anomalies.
- Our platform utilizes Isolation Forest to identify statistical anomalies in government department spending.`;
    }
    if (/confidence/i.test(message)) {
      return `### AI Confidence Rating
The **Confidence Score** represents the statistical probability (from 0% to 100%) that the AI classification is correct.
- A confidence of 99% indicates a high-probability match with established anomaly triggers.
- Lower confidence ratings signal borderline cases requiring manual auditor scrutiny.`;
    }
    if (/risk/i.test(message)) {
      return `### Risk Score Tiers
The **Risk Score** indicates a transaction's deviation from normal accounting integrity rules:
- **Low Risk (0 - 39%)**: Approved payment.
- **Medium Risk (40 - 69%)**: Audit warnings issued.
- **High Risk (70 - 100%)**: Critical deviation. Payments are suspended automatically and sent to the investigation queues.`;
    }
  }

  if (/investigation/i.test(message) && context.includes('Investigation Case Details')) {
    try {
      const details = JSON.parse(context.replace('Investigation Case Details: ', ''));
      return `### Summary of Investigation #${details.id}
The case file is currently **${details.status}** and assigned to officer **${details.officer_name || 'Unassigned'}**.
- **Record Number**: ${details.record_number}
- **Vendor**: ${details.vendor}
- **Amount**: INR ${parseFloat(details.amount).toLocaleString('en-IN')}
- **AI Triggers**:
${(details.reasons || []).map(r => `  - ${r}`).join('\n')}
- **Integrity Recommendations**: ${details.recommendation || 'Perform forensic audit on vendor records.'}`;
    } catch (e) {
      console.error('[Chat Service] Fallback parse error:', e);
    }
  }

  if ((/invoice/i.test(message) || /record/i.test(message)) && context.includes('Financial Record')) {
    try {
      const recordsIdx = context.indexOf('[');
      const records = JSON.parse(context.substring(recordsIdx));
      const rec = records[0];
      return `### Financial Record Details: ${rec.record_number}
- **Vendor**: ${rec.vendor}
- **Invoice Number**: ${rec.invoice_number}
- **Amount**: INR ${parseFloat(rec.amount).toLocaleString('en-IN')}
- **Risk Evaluation**: ${rec.risk_score}% (**${rec.prediction || 'Not Evaluated'}**)
- **Anomalies Flagged**:
${(rec.fraud_reasons || []).map(r => `  - ${r}`).join('\n')}
- **Audit Action Plan**: ${rec.recommendation || 'Review authorizations.'}`;
    } catch (e) {
      console.error('[Chat Service] Fallback parse error:', e);
    }
  }

  // General fallback summary
  return `### GovGuard AI Platform Overview
Welcome back, Investigator. Here is the current summary of the platform data:
- **Total Ingested Records**: ${context.match(/Total Financial Records:\s*(\d+)/)?.[1] || 0}
- **High Risk Records**: ${context.match(/High Risk Records[^:]*:\s*(\d+)/)?.[1] || 0}
- **Open Investigations**: ${context.match(/Active Open Investigations:\s*(\d+)/)?.[1] || 0}

*Note: GovGuard AI Assistant is operating in local diagnostic fallback mode. Configure GEMINI_API_KEY in the environment for full semantic LLM interaction.*`;
};

/**
 * Handles generating replies to audit queries by querying relevant context and invoking Google Gemini / OpenAI.
 */
const generateResponse = async (userMessage) => {
  const context = await getChatContext(userMessage);
  const formattedPrompt = systemPrompt.replace('{{context}}', context);

  // 1. Try Gemini API if key is present
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [
            {
              parts: [
                { text: `${formattedPrompt}\n\nUser Question: ${userMessage}` }
              ]
            }
          ]
        },
        { timeout: 10000 }
      );
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.error('[Chat Service] Gemini API call failed:', err.message);
    }
  }

  // 2. Try OpenAI API if key is present
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: formattedPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content;
      }
    } catch (err) {
      console.error('[Chat Service] OpenAI API call failed:', err.message);
    }
  }

  // 3. Fallback to local agent solver
  return generateLocalResponse(userMessage, context);
};

module.exports = {
  generateResponse,
};
