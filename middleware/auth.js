const jwt = require('jsonwebtoken');
const User = require('../models/User');

// General authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : null;

    // Read token from Authorization header first, then fallback to httpOnly cookie
    const token = bearerToken || req.cookies.authToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === 'admin') {
      // For admin, we don't need to query the database
      req.user = {
        id: 'admin',
        email: process.env.ADMIN_ID,
        role: 'admin'
      };
    } else {
      // For regular users, get user from database
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found or inactive.'
        });
      }
      req.user = user;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// User only middleware
const userOnly = (req, res, next) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. User privileges required.'
    });
  }
  next();
};

module.exports = {
  authenticate,
  adminOnly,
  userOnly
};