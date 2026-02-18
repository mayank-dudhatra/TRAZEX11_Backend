const express = require('express');
const router = express.Router();
const { authenticate, userOnly } = require('../middleware/auth');
const {
  getContestsByDateMarket,
  joinContest,
  getUserJoinedContests,
  getUserTeamsForContest
} = require('../controllers/contestController');

// @route   GET /api/contests?date=YYYY-MM-DD&market=NSE
// @desc    Get contests by date and market, grouped by duration
// @access  Public
router.get('/', getContestsByDateMarket);

// @route   POST /api/contests/:contestId/join
// @desc    Join contest with a team
// @access  Private (User only)
router.post('/:contestId/join', authenticate, userOnly, joinContest);

// @route   GET /api/contests/user
// @desc    Get contests joined by current user
// @access  Private (User only)
router.get('/user', authenticate, userOnly, getUserJoinedContests);

// @route   GET /api/contests/:contestId/teams
// @desc    Get current user's teams for a contest
// @access  Private (User only)
router.get('/:contestId/teams', authenticate, userOnly, getUserTeamsForContest);

module.exports = router;
