const Leaderboard = require('../models/Leaderboard');

// User: Get leaderboard for a contest
const getContestLeaderboard = async (req, res) => {
  try {
    const { contestId } = req.params;

    const leaderboard = await Leaderboard.find({ contestId })
      .sort({ rank: 1, points: -1 })
      .populate('userId', 'username')
      .populate('teamId');

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getContestLeaderboard
};
