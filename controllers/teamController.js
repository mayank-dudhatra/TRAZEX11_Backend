const Contest = require('../models/Contest');
const Team = require('../models/Team');

const isStockInList = (stocks, target) => {
  return stocks.some((stock) => (
    stock.stockSymbol === target.stockSymbol
    && stock.action === target.action
  ));
};

// User: Create team
const createTeam = async (req, res) => {
  try {
    const { contestId, stocks, captain, viceCaptain } = req.body;

    if (!contestId || !Array.isArray(stocks) || stocks.length === 0 || !captain || !viceCaptain) {
      return res.status(400).json({
        success: false,
        message: 'contestId, stocks, captain, and viceCaptain are required'
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

    if (!isStockInList(stocks, captain) || !isStockInList(stocks, viceCaptain)) {
      return res.status(400).json({
        success: false,
        message: 'Captain and vice-captain must be part of the stocks list'
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

module.exports = {
  createTeam
};
