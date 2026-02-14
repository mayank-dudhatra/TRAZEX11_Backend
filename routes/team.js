const express = require('express');
const router = express.Router();
const { authenticate, userOnly } = require('../middleware/auth');
const { createTeam } = require('../controllers/teamController');

// Apply user authentication to all routes
router.use(authenticate, userOnly);

// @route   POST /api/teams
// @desc    Create team for a contest
// @access  Private (User only)
router.post('/', createTeam);

module.exports = router;
