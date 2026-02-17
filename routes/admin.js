const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getDashboardStats,
  distributeContestPrizes
} = require('../controllers/adminController');
const {
  createContest,
  getContestsByDateRange,
  getContestDetails
} = require('../controllers/contestController');
const {
  createDateContest,
  getDateContests
} = require('../controllers/dateContestController');
const { validateUpdateUserStatus } = require('../utils/validation');

// Apply admin authentication to all routes
router.use(authenticate, adminOnly);

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', getDashboardStats);

// @route   POST /api/admin/contests
// @desc    Create contest (manual admin)
// @access  Private (Admin only)
router.post('/contests', createContest);

// @route   GET /api/admin/contests
// @desc    Get contests by date range
// @access  Private (Admin only)
router.get('/contests', getContestsByDateRange);

// @route   GET /api/admin/contests/:id
// @desc    Get contest details with leaderboard
// @access  Private (Admin only)
router.get('/contests/:id', getContestDetails);

// @route   POST /api/admin/contests/:id/distribute-prizes
// @desc    Distribute prizes to winners of a completed contest
// @access  Private (Admin only)
router.post('/contests/:contestId/distribute-prizes', distributeContestPrizes);

// @route   POST /api/admin/date-contests
// @desc    Create date contest card
// @access  Private (Admin only)
router.post('/date-contests', createDateContest);

// @route   GET /api/admin/date-contests
// @desc    Get all date contests
// @access  Private (Admin only)
router.get('/date-contests', getDateContests);

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin only)
router.get('/users', getAllUsers);

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/users/:id', getUserById);

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin only)
router.put('/users/:id/status', validateUpdateUserStatus, updateUserStatus);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/users/:id', deleteUser);

module.exports = router;