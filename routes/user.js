const express = require('express');
const router = express.Router();
const { authenticate, userOnly } = require('../middleware/auth');
const {
  updateProfile,
  changePassword,
  getMyProfile,
  deleteAccount
} = require('../controllers/userController');
const {
  validateUpdateProfile,
  validateChangePassword
} = require('../utils/validation');

// Apply user authentication to all routes
router.use(authenticate, userOnly);

// @route   GET /api/user/profile
// @desc    Get current user profile
// @access  Private (User only)
router.get('/profile', getMyProfile);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private (User only)
router.put('/profile', validateUpdateProfile, updateProfile);

// @route   PUT /api/user/change-password
// @desc    Change user password
// @access  Private (User only)
router.put('/change-password', validateChangePassword, changePassword);

// @route   DELETE /api/user/account
// @desc    Delete user account
// @access  Private (User only)
router.delete('/account', deleteAccount);

module.exports = router;