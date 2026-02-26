const express = require('express');
const router = express.Router();
const { authenticate, userOnly } = require('../middleware/auth');
const { createTeam, getTeamById, updateTeam } = require('../controllers/teamController');

// Apply user authentication to all routes
router.use(authenticate, userOnly);

// @route   POST /api/teams
// @desc    Create team for a contest
// @access  Private (User only)
router.post('/', createTeam);

// @route   GET /api/teams/:teamId
// @desc    Get current user's team by id
// @access  Private (User only)
router.get('/:teamId', getTeamById);

// @route   PUT /api/teams/:teamId
// @desc    Update current user's team before contest entry close
// @access  Private (User only)
router.put('/:teamId', updateTeam);

module.exports = router;
