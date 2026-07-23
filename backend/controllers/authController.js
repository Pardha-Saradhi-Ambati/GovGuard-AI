const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { query } = require('../config/db');
const { createNotification } = require('../services/notificationService');

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

    // Dispatch login notification
    createNotification({
      userId: user.id,
      title: 'Login Detected',
      message: `Successful verification login session established for @${user.username}.`,
      type: 'login',
      priority: 'Low'
    });

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

// @desc    Auth user with Google token
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    return next(new Error('Please provide a valid Google ID token'));
  }

  try {
    // 1. Verify token with Google's tokeninfo API
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const { sub, email, name, picture, aud } = response.data;

    // 2. Validate Google Client ID if configured
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (googleClientId && aud !== googleClientId) {
      res.status(400);
      return next(new Error('Invalid token audience verification failed'));
    }

    // 3. Find user by google_id
    let userRes = await query('SELECT * FROM users WHERE google_id = $1', [sub]);
    let user = userRes.rows[0];

    if (!user) {
      // 4. Look up user by email
      userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
      user = userRes.rows[0];

      if (user) {
        // Link Google Account to existing user
        const updateRes = await query(
          'UPDATE users SET google_id = $1, profile_picture = COALESCE(profile_picture, $2) WHERE id = $3 RETURNING *',
          [sub, picture || '', user.id]
        );
        user = updateRes.rows[0];
      } else {
        // 5. Create new user
        // Generate unique username from email
        let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const checkUsername = await query('SELECT 1 FROM users WHERE username = $1', [username]);
        if (checkUsername.rows.length > 0) {
          username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // Generate secure dummy password hash for constraint satisfaction
        const dummyPassword = Math.random().toString(36).slice(-10) + '!';
        const passwordHash = await bcrypt.hash(dummyPassword, 10);

        const insertQuery = `
          INSERT INTO users (username, email, password_hash, role, google_id, profile_picture)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;
        const insertRes = await query(insertQuery, [
          username,
          email,
          passwordHash,
          'Investigation Officer',
          sub,
          picture || ''
        ]);
        user = insertRes.rows[0];
      }
    }

    // 6. Generate standard JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'supersecretgovkey12345!',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Dispatch login notification
    createNotification({
      userId: user.id,
      title: 'Login Detected',
      message: `Successful verification login session established for @${user.username} via Google.`,
      type: 'login',
      priority: 'Low'
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        google_id: user.google_id,
        profile_picture: user.profile_picture,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    const errMsg = error.response?.data?.error_description || error.message;
    res.status(401);
    next(new Error(`Google authentication failed: ${errMsg}`));
  }
};

module.exports = {
  login,
  getMe,
  getOfficers,
  googleLogin,
};
