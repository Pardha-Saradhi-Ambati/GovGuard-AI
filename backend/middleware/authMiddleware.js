const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretgovkey12345!');
      
      // Fetch user from DB to make sure they still exist and check their role
      const userRes = await query('SELECT id, username, email, role FROM users WHERE id = $1', [decoded.id]);
      
      if (userRes.rows.length === 0) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }
      
      req.user = userRes.rows[0];
      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token provided'));
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`Role '${req.user ? req.user.role : 'Guest'}' is not authorized to access this resource`));
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
