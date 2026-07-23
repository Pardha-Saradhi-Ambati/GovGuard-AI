const { query } = require('../config/db');

/**
 * Creates a notification for a user (or all users if userId is null/omitted).
 * 
 * @param {Object} notificationDetails
 * @param {number|null} [notificationDetails.userId] - Recipient user ID (if null, creates for all users)
 * @param {string} notificationDetails.title - Notification title
 * @param {string} notificationDetails.message - Detailed explanation message
 * @param {string} notificationDetails.type - Notification type (e.g. 'high_risk', 'alert', 'assigned', etc.)
 * @param {string} [notificationDetails.priority] - Severity/Priority (Low, Medium, High, Critical)
 * @param {string|null} [notificationDetails.referenceType] - Associated entity type (e.g., 'record', 'alert')
 * @param {number|null} [notificationDetails.referenceId] - Associated entity primary key ID
 */
const createNotification = async ({ userId = null, title, message, type, priority = 'Low', referenceType = null, referenceId = null }) => {
  try {
    const insertQuery = `
      INSERT INTO notifications (user_id, title, message, type, priority, reference_type, reference_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    if (userId) {
      await query(insertQuery, [userId, title, message, type, priority, referenceType, referenceId]);
    } else {
      // Global notification - fetch all users and insert notifications for each user
      const usersRes = await query('SELECT id FROM users');
      for (const u of usersRes.rows) {
        await query(insertQuery, [u.id, title, message, type, priority, referenceType, referenceId]);
      }
    }
  } catch (err) {
    console.error('[Notification Service] Error creating notification:', err);
  }
};

module.exports = {
  createNotification,
};
