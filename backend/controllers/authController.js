const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400);
    return next(new Error('Please provide both username and password'));
  }

  try {
    // Find user
    const userRes = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userRes.rows[0];

    if (!user) {
      res.status(401);
      return next(new Error('Invalid username or password'));
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401);
      return next(new Error('Invalid username or password'));
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'supersecretgovkey12345!',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  // req.user is set by protect middleware
  res.status(200).json({
    user: req.user,
  });
};

// @desc    Get all investigation officers
// @route   GET /api/auth/officers
// @access  Private
const getOfficers = async (req, res, next) => {
  try {
    const officersRes = await query(
      "SELECT id, username, email FROM users WHERE role = 'Investigation Officer' ORDER BY username ASC"
    );
    res.status(200).json(officersRes.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  getOfficers,
};
