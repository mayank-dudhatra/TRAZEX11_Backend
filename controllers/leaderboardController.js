const mongoose = require('mongoose');
const Leaderboard = require('../models/Leaderboard');

const fetchLeaderboardData = async (contestId, limit) => {
  const Contest = require('../models/Contest');
  
  const leaderboard = await Leaderboard.find({ contestId })
    .sort({ rank: 1, points: -1 })
    .limit(limit)
    .populate('userId', 'username email')
    .populate('teamId', 'stocks captain viceCaptain totalPoints')
    .lean();

  // Fetch contest details
  const contest = await Contest.findById(contestId).select('name contestDate').lean();

  return {
    contest: {
      id: contestId,
      name: contest?.name || 'Unknown Contest',
      date: contest?.contestDate ? new Date(contest.contestDate).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }) : 'Unknown Date'
    },
    entries: leaderboard.map((entry, index) => ({
      _id: entry._id,
      contestId: entry.contestId,
      rank: Number.isFinite(Number(entry.rank)) ? Number(entry.rank) : index + 1,
      points: Number(entry.points) || 0,
      winningAmount: Number(entry.winningAmount) || 0,
      user: {
        id: entry.userId?._id,
        name: entry.userId?.username || entry.userId?.email || 'Unknown',
      },
      team: entry.teamId
        ? {
            id: entry.teamId._id,
            stocks: Array.isArray(entry.teamId.stocks) ? entry.teamId.stocks : [],
            captain: entry.teamId.captain || null,
            viceCaptain: entry.teamId.viceCaptain || null,
            totalPoints: Number(entry.teamId.totalPoints) || 0,
          }
        : null,
    }))
  };
};

// User: Get leaderboard for a contest
const getContestLeaderboard = async (req, res) => {
  try {
    const { contestId } = req.params;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 3;

    if (!mongoose.Types.ObjectId.isValid(contestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest id'
      });
    }

    const { contest, entries } = await fetchLeaderboardData(contestId, limit);

    res.json({
      success: true,
      contest,
      data: entries
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

const getLatestContestLeaderboard = async (req, res) => {
  try {
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 3;

    const latestEntry = await Leaderboard.findOne({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .select('contestId')
      .lean();

    if (!latestEntry?.contestId) {
      return res.json({
        success: true,
        contest: null,
        data: []
      });
    }

    const { contest, entries } = await fetchLeaderboardData(latestEntry.contestId, limit);

    return res.json({
      success: true,
      contest,
      data: entries
    });
  } catch (error) {
    console.error('Get latest leaderboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest leaderboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getContestLeaderboard,
  getLatestContestLeaderboard
};
