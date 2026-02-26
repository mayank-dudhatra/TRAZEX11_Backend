const Contest = require('../models/Contest');
const Team = require('../models/Team');
const mongoose = require('mongoose');

const isStockInList = (stocks, target) => {
  return stocks.some((stock) => (
    stock.stockSymbol === target.stockSymbol
    && stock.action === target.action
  ));
};

const validateTeamPayload = ({ contestId, stocks, captain, viceCaptain }) => {
  if (!contestId || !Array.isArray(stocks) || stocks.length === 0 || !captain || !viceCaptain) {
    return 'contestId, stocks, captain, and viceCaptain are required';
  }

  if (!isStockInList(stocks, captain) || !isStockInList(stocks, viceCaptain)) {
    return 'Captain and vice-captain must be part of the stocks list';
  }

  return null;
};

// User: Create team
const createTeam = async (req, res) => {
  try {
    const { contestId, stocks, captain, viceCaptain } = req.body;

    const validationError = validateTeamPayload({ contestId, stocks, captain, viceCaptain });
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    const now = new Date();
    if (now > contest.entryCloseTime) {
      return res.status(400).json({
        success: false,
        message: 'Entry time is closed for this contest'
      });
    }

    const team = await Team.create({
      userId: req.user.id,
      contestId,
      stocks,
      captain,
      viceCaptain
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team id'
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      userId: req.user.id
    }).lean();

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    return res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Get team by id error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { contestId, stocks, captain, viceCaptain } = req.body;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team id'
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      userId: req.user.id
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const effectiveContestId = contestId || team.contestId;
    const contest = await Contest.findById(effectiveContestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    const now = new Date();
    if (now > contest.entryCloseTime) {
      return res.status(400).json({
        success: false,
        message: 'Entry time is closed for this contest'
      });
    }

    const validationError = validateTeamPayload({
      contestId: effectiveContestId,
      stocks,
      captain,
      viceCaptain
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    team.contestId = effectiveContestId;
    team.stocks = stocks;
    team.captain = captain;
    team.viceCaptain = viceCaptain;
    await team.save();

    return res.json({
      success: true,
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    console.error('Update team error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTeam,
  getTeamById,
  updateTeam
};
