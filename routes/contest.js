const express = require('express');
const router = express.Router();
const { authenticate, userOnly } = require('../middleware/auth');
const {
  getContestsByDateMarket,
  joinContest
} = require('../controllers/contestController');

// @route   GET /api/contests?date=YYYY-MM-DD&market=NSE
// @desc    Get contests by date and market, grouped by duration
// @access  Public
router.get('/', getContestsByDateMarket);

// @route   POST /api/contests/:contestId/join
// @desc    Join contest with a team
// @access  Private (User only)
router.post('/:contestId/join', authenticate, userOnly, joinContest);

module.exports = router;
