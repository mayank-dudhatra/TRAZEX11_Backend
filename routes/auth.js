const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  signUp, 
  login, 
  getProfile, 
  logout 
} = require('../controllers/authController');
const {
  validateSignUp,
  validateLogin
} = require('../utils/validation');

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', validateSignUp, signUp);

// @route   POST /api/auth/login
// @desc    Login user (auto-detect admin or user)
// @access  Public
router.post('/login', validateLogin, login);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

module.exports = router;