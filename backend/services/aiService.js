const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

const getAIServiceEndpoint = () => {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  return baseUrl.endsWith('/') ? `${baseUrl}api/v1/predict` : `${baseUrl}/api/v1/predict`;
};

/**
 * Sends financial record to FastAPI AI service for Isolation Forest risk prediction.
 * Implements 5-second timeout, 1 retry attempt, structured logging, and non-blocking fallback.
 * 
 * @param {Object} record - Financial record details
 * @returns {Promise<Object|null>} Prediction response object or null if service is unavailable
 */
const predictFraudRisk = async (record) => {
  const endpoint = getAIServiceEndpoint();
  const startTime = Date.now();
  const maxAttempts = 2; // Initial attempt + 1 retry

  const payload = {
    record_number: record.record_number || null,
    department: record.department,
    vendor: record.vendor,
    invoice_number: record.invoice_number,
    payment_method: record.payment_method,
    amount: parseFloat(record.amount),
    purpose: record.purpose,
    date: record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: record.status || 'Pending',
  };

  logger.info(`[AI Service] Request started for record ${payload.record_number || 'NEW'} (Vendor: ${payload.vendor}, Amount: INR ${payload.amount})`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        logger.warn(`[AI Service] Retrying request for record ${payload.record_number || 'NEW'} (Attempt ${attempt}/${maxAttempts})...`);
      }

      const response = await axios.post(endpoint, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const duration = Date.now() - startTime;
      const data = response.data; // { risk_score, prediction, confidence, reasons, recommendation }

      logger.info(
        `[AI Service] Response received in ${duration}ms (Attempt ${attempt}/${maxAttempts}). Final Status: Completed | Risk Score: ${data.risk_score}% | Prediction: ${data.prediction} | Confidence: ${data.confidence}%`
      );

      const reasons = data.reasons && data.reasons.length > 0 
        ? data.reasons 
        : ['No significant fraud indicators detected.'];
      const recommendation = data.recommendation || 'No AI explanation available';

      return {
        risk_score: data.risk_score,
        prediction: data.prediction,
        confidence: data.confidence,
        reasons,
        recommendation,
        duration,
        attempts: attempt,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error.response
        ? `HTTP ${error.response.status} - ${JSON.stringify(error.response.data)}`
        : error.message;

      logger.warn(`[AI Service] Attempt ${attempt}/${maxAttempts} failed in ${duration}ms: ${errorMessage}`);

      if (attempt === maxAttempts) {
        logger.warn(
          `[AI Service] AI service unavailable after ${maxAttempts} attempts. Final Status: Pending | Record ${payload.record_number || 'NEW'} saved normally.`
        );
        return null;
      }
    }
  }

  return null;
};

module.exports = {
  predictFraudRisk,
};
