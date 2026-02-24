const User = require('../models/User');
const Contest = require('../models/Contest');
const Leaderboard = require('../models/Leaderboard');
const Wallet = require('../models/Wallet');
const dailyStockScoringService = require('../services/dailyStockScoringService');

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalUsers = await User.countDocuments({});
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single user by ID (Admin only)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update user status (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get dashboard statistics (Admin only)
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get users who logged in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayLogins = await User.countDocuments({
      lastLogin: {
        $gte: today,
        $lt: tomorrow
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        recentUsers,
        todayLogins
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Distribute prizes for a completed contest (Admin only)
const distributeContestPrizes = async (req, res) => {
  try {
    const { contestId } = req.params;

    // Find the contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Check if prizes already distributed
    if (contest.isPrizeDistributed) {
      return res.status(400).json({
        success: false,
        message: 'Prizes for this contest have already been distributed'
      });
    }

    // Check if contest is completed
    if (contest.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Contest must be completed before distributing prizes'
      });
    }

    // Get all leaderboard entries sorted by points
    const leaderboardEntries = await Leaderboard.find({ contestId })
        .sort({ points: -1, updatedAt: 1 })
      .populate('userId', 'username email');

    if (leaderboardEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No participants found for this contest'
      });
    }

    // Assign ranks and distribute prizes
    const distributions = [];
    let currentRank = 1;

    for (let i = 0; i < leaderboardEntries.length; i++) {
      const entry = leaderboardEntries[i];
      
      // Update rank
      entry.rank = currentRank;
      
      // Find matching prize breakup for this rank
      const prizeInfo = contest.prizeBreakup.find(
        pb => currentRank >= pb.rankFrom && currentRank <= pb.rankTo
      );

      if (prizeInfo && prizeInfo.prizeEach > 0) {
        // Credit prize to user wallet
        let wallet = await Wallet.findOne({ userId: entry.userId._id });
        
        if (!wallet) {
          // Create wallet if doesn't exist
          wallet = await Wallet.create({
            userId: entry.userId._id,
            balance: 0,
            transactions: []
          });
        }

        wallet.balance += prizeInfo.prizeEach;
        wallet.transactions.push({
          type: 'CREDIT',
          amount: prizeInfo.prizeEach,
          reason: `Prize for Rank ${currentRank} in ${contest.name}`
        });

        await wallet.save();

        // Update leaderboard with winning amount
        entry.winningAmount = prizeInfo.prizeEach;
        await entry.save();

        distributions.push({
          userId: entry.userId._id,
          username: entry.userId.username,
          rank: currentRank,
          points: entry.points,
          winningAmount: prizeInfo.prizeEach
        });
      } else {
        // No prize for this rank, just save the rank
        entry.winningAmount = 0;
        await entry.save();
      }

      currentRank++;
    }

    // Mark contest as prize distributed
    contest.isPrizeDistributed = true;
    await contest.save();

    res.json({
      success: true,
      message: 'Prizes distributed successfully',
      data: {
        contestId: contest._id,
        contestName: contest.name,
        totalParticipants: leaderboardEntries.length,
        totalWinners: distributions.length,
        totalPrizeDistributed: distributions.reduce((sum, d) => sum + d.winningAmount, 0),
        distributions
      }
    });

  } catch (error) {
    console.error('Distribute prizes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to distribute prizes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reset daily stock points (Admin only - for testing)
const resetDailyStockPoints = async (req, res) => {
  try {
    const result = await dailyStockScoringService.resetDailyScores();
    
    res.json({
      success: true,
      message: 'Daily stock points reset successfully',
      data: result
    });
  } catch (error) {
    console.error('Reset daily stock points error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset daily stock points',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get stock score breakdown (Admin only - for debugging)
const getStockScoreBreakdown = async (req, res) => {
  try {
    const { symbol } = req.params;
    const breakdown = await dailyStockScoringService.getStockScoreBreakdown(symbol);
    
    if (!breakdown) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found or not initialized'
      });
    }

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Get stock score breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stock score breakdown',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getDashboardStats,
  distributeContestPrizes,
  resetDailyStockPoints,
  getStockScoreBreakdown
};