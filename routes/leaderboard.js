const express = require('express');
const router = express.Router();
const { authenticate, userOnly } = require('../middleware/auth');
const { getContestLeaderboard } = require('../controllers/leaderboardController');

// @route   GET /api/leaderboard/:contestId
// @desc    Get leaderboard for contest
// @access  Private (User only)
router.get('/:contestId', authenticate, userOnly, getContestLeaderboard);

module.exports = router;
