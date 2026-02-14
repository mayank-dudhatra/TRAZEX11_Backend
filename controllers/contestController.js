const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const DateContest = require('../models/DateContest');
const Team = require('../models/Team');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Leaderboard = require('../models/Leaderboard');


const computeContestStatus = (contest) => {
  const now = new Date();
  if (now < contest.contestStartTime) {
    return 'Upcoming';
  }
  if (now >= contest.contestStartTime && now <= contest.contestEndTime) {
    return 'Live';
  }
  return 'Completed';
};

// Admin: Create contest
const createContest = async (req, res) => {
  try {
    const {
      dateContestId,
      name,
      entryCloseTime,
      contestStartTime,
      contestEndTime,
      entryFee,
      totalSpots,
      maximumTeamPerUser,
      prizePool,
      prizeBreakup
    } = req.body;

    if (!dateContestId || !name || !entryCloseTime
      || !contestStartTime || !contestEndTime || entryFee === undefined || totalSpots === undefined
      || maximumTeamPerUser === undefined || prizePool === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required contest fields'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(dateContestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date contest id'
      });
    }

    const dateContest = await DateContest.findById(dateContestId);
    if (!dateContest) {
      return res.status(404).json({
        success: false,
        message: 'Date contest not found'
      });
    }

    const parsedEntryCloseTime = new Date(entryCloseTime);
    const parsedStartTime = new Date(contestStartTime);
    const parsedEndTime = new Date(contestEndTime);

    if (Number.isNaN(parsedEntryCloseTime.getTime())
      || Number.isNaN(parsedStartTime.getTime())
      || Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time fields'
      });
    }

    if (parsedEntryCloseTime >= parsedStartTime) {
      return res.status(400).json({
        success: false,
        message: 'Entry close time must be before or equal to contest start time'
      });
    }

    if (parsedEndTime <= parsedStartTime) {
      return res.status(400).json({
        success: false,
        message: 'Contest end time must be after contest start time'
      });
    }

    const contest = await Contest.create({
      dateContestId: dateContest._id,
      name,
      marketType: dateContest.marketType,
      contestDurationType: dateContest.contestDurationType,
      contestDate: dateContest.startDate,
      entryCloseTime: parsedEntryCloseTime,
      contestStartTime: parsedStartTime,
      contestEndTime: parsedEndTime,
      entryFee,
      totalSpots,
      maximumTeamPerUser,
      prizePool,
      prizeBreakup: Array.isArray(prizeBreakup)
        ? prizeBreakup.map((range) => {
            const rankFrom = Number(range.rankFrom);
            const rankTo = Number(range.rankTo);
            const prizeEach = Number(range.prizeEach);
            if (Number.isNaN(rankFrom) || Number.isNaN(rankTo) || Number.isNaN(prizeEach)) {
              throw new Error('Invalid prize breakup values');
            }
            if (rankFrom > rankTo) {
              throw new Error('Prize breakup rankFrom must be <= rankTo');
            }
            if (prizeEach < 0) {
              throw new Error('Prize breakup prizeEach must be >= 0');
            }
            const winners = rankTo - rankFrom + 1;
            const totalPrize = winners * prizeEach;
            return {
              rankFrom,
              rankTo,
              winners,
              prizeEach,
              totalPrize
            };
          })
        : []
    });

    res.status(201).json({
      success: true,
      message: 'Contest created successfully',
      contest
    });
  } catch (error) {
    console.error('Create contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// User: Get contests by date and market, grouped by duration
const getContestsByDateMarket = async (req, res) => {
  try {
    const { date, market } = req.query;

    if (!date || !market) {
      return res.status(400).json({
        success: false,
        message: 'date and market are required'
      });
    }

    const start = new Date(date);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 59, 999);

    const dateContests = await DateContest.find({
      marketType: market,
      startDate: { $lte: dayEnd },
      endDate: { $gte: dayStart }
    }).lean();

    if (!dateContests.length) {
      return res.json({
        success: true,
        data: { daily: [], weekly: [], monthly: [] }
      });
    }

    const dateContestIds = dateContests.map((contest) => contest._id);
    const contestDurationMap = dateContests.reduce((acc, contest) => {
      acc[contest._id.toString()] = contest.contestDurationType;
      return acc;
    }, {});

    const contests = await Contest.find({
      dateContestId: { $in: dateContestIds }
    }).sort({ contestStartTime: 1 }).lean();

    const grouped = contests.reduce((acc, contest) => {
      const status = computeContestStatus(contest);
      const key = contestDurationMap[contest.dateContestId?.toString()] || 'daily';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        ...contest,
        status
      });
      return acc;
    }, { daily: [], weekly: [], monthly: [] });

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Get contests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// User: Join contest
const joinContest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { contestId } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'teamId is required'
      });
    }

    session.startTransaction();

    const contest = await Contest.findById(contestId).session(session);
    if (!contest) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    if (contest.isCancelled) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Contest is cancelled'
      });
    }

    const now = new Date();
    if (now > contest.entryCloseTime) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Entry time is closed for this contest'
      });
    }

    const status = computeContestStatus(contest);
    if (status === 'Completed') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Contest is already completed'
      });
    }

    if (contest.filledSpots >= contest.totalSpots) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Contest spots are full'
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      contestId,
      userId: req.user.id
    }).session(session);

    if (!team) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Team not found for this contest'
      });
    }

    const alreadyJoined = contest.joinedTeams.some((entry) => (
      entry.teamId && entry.teamId.toString() === teamId
    ));

    if (alreadyJoined) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Team already joined this contest'
      });
    }

    const teamsCount = await Team.countDocuments({
      contestId,
      userId: req.user.id
    }).session(session);

    if (teamsCount >= contest.maximumTeamPerUser) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Maximum teams per user reached for this contest'
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user.id }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{
        userId: req.user.id,
        balance: 0,
        transactions: []
      }], { session });
      wallet = wallet[0];
    }

    if (wallet.balance < contest.entryFee) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    wallet.balance -= contest.entryFee;
    wallet.transactions.push({
      type: 'DEBIT',
      amount: contest.entryFee,
      reason: `Contest entry fee: ${contest.name}`
    });
    await wallet.save({ session });

    contest.filledSpots += 1;
    contest.joinedTeams.push({ userId: req.user.id, teamId });
    await contest.save({ session });

    const [leaderboardEntry] = await Leaderboard.create([{
      contestId,
      userId: req.user.id,
      teamId,
      points: 0,
      winningAmount: 0
    }], { session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Contest joined successfully',
      data: {
        contestId,
        teamId,
        walletBalance: wallet.balance,
        leaderboardEntry
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Join contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join contest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Admin: Get contests by date range
const getContestsByDateRange = async (req, res) => {
  try {
    const { from, to, market } = req.query;

    if (!from || !to || !market) {
      return res.status(400).json({
        success: false,
        message: 'from, to, and market are required'
      });
    }

    const start = new Date(from);
    const end = new Date(to);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    const contests = await Contest.find({
      marketType: market,
      contestStartTime: { $gte: start, $lte: end }
    })
      .sort({ contestStartTime: 1 })
      .lean();

    res.json({
      success: true,
      contests
    });
  } catch (error) {
    console.error('Get contests by date range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Get contest details with leaderboard
const getContestDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contest id'
      });
    }

    const contest = await Contest.findById(id).lean();
    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    const leaderboard = await Leaderboard.find({ contestId: id })
      .populate('userId', 'username email')
      .populate('teamId', 'teamName')
      .sort({ rank: 1 })
      .lean();

    const leaderboardFormatted = leaderboard.map((entry) => ({
      _id: entry._id,
      userName: entry.userId?.username || entry.userId?.email || 'Unknown',
      teamName: entry.teamId?.teamName || 'Unknown Team',
      points: entry.points,
      rank: entry.rank,
      winningAmount: entry.winningAmount
    }));

    res.json({
      success: true,
      contest,
      leaderboard: leaderboardFormatted
    });
  } catch (error) {
    console.error('Get contest details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contest details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createContest,
  getContestsByDateMarket,
  joinContest,
  getContestsByDateRange,
  getContestDetails
};
