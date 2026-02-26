const express = require('express');
const router = express.Router();
const { getContestLeaderboard, getLatestContestLeaderboard } = require('../controllers/leaderboardController');

// @route   GET /api/leaderboard/latest
// @desc    Get latest contest leaderboard
// @access  Public
router.get('/latest', getLatestContestLeaderboard);

// @route   GET /api/leaderboard/:contestId
// @desc    Get leaderboard for contest
// @access  Public
router.get('/:contestId', getContestLeaderboard);

module.exports = router;
