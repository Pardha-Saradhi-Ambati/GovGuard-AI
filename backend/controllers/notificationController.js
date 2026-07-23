const { query } = require('../config/db');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationsRes = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.status(200).json(notificationsRes.rows);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const updateRes = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (updateRes.rows.length === 0) {
      res.status(404);
      return next(new Error('Notification not found or access denied'));
    }

    res.status(200).json(updateRes.rows[0]);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read for current user
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllRead = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const updateRes = await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 RETURNING *',
      [userId]
    );

    res.status(200).json({ success: true, count: updateRes.rows.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete single notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const deleteRes = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (deleteRes.rows.length === 0) {
      res.status(404);
      return next(new Error('Notification not found or access denied'));
    }

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification,
};
