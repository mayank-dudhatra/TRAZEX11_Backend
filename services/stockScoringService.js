const Contest = require('../models/Contest');
const Team = require('../models/Team');
const Leaderboard = require('../models/Leaderboard');
const Wallet = require('../models/Wallet');
const ContestStockState = require('../models/ContestStockState');
const TeamStockMilestone = require('../models/TeamStockMilestone');
const { calculateStockPoints } = require('../utils/calculateStockPoints');

const VOLUME_EMA_ALPHA = 0.2;
const DISTRIBUTION_COOLDOWN_MS = 60 * 1000;

class StockScoringService {
  constructor() {
    this.lastDistributionCheck = 0;
  }

  async processStockUpdates(changedStocks) {
    if (!Array.isArray(changedStocks) || !changedStocks.length) {
      return { updatedTeams: 0, contests: [] };
    }

    const now = new Date();
    const symbols = [...new Set(changedStocks.map((stock) => stock.symbol))];
    const stockMap = new Map(changedStocks.map((stock) => [stock.symbol, stock]));

    const contests = await Contest.find({
      isCancelled: false,
      contestStartTime: { $lte: now },
      contestEndTime: { $gte: now }
    }).select('_id entryCloseTime contestStartTime contestEndTime prizeBreakup totalSpots').lean();

    if (!contests.length) {
      await this._maybeDistributePrizes(now);
      return { updatedTeams: 0, contests: [] };
    }

    const contestIds = contests.map((contest) => contest._id);
    const teams = await Team.find({
      contestId: { $in: contestIds },
      'stocks.stockSymbol': { $in: symbols }
    }).lean();

    if (!teams.length) {
      await this._maybeDistributePrizes(now);
      return { updatedTeams: 0, contests: [] };
    }

    const contestStockKeys = new Set();
    teams.forEach((team) => {
      team.stocks.forEach((stock) => {
        if (symbols.includes(stock.stockSymbol)) {
          contestStockKeys.add(`${team.contestId.toString()}::${stock.stockSymbol}`);
        }
      });
    });

    const contestStockPairs = [...contestStockKeys].map((key) => {
      const [contestId, stockSymbol] = key.split('::');
      return { contestId, stockSymbol };
    });

    const existingStates = await ContestStockState.find({
      contestId: { $in: contestIds },
      stockSymbol: { $in: symbols }
    }).lean();

    const stateMap = new Map(
      existingStates.map((state) => [`${state.contestId.toString()}::${state.stockSymbol}`, state])
    );

    const stateBulkOps = [];
    contestStockPairs.forEach(({ contestId, stockSymbol }) => {
      const stock = stockMap.get(stockSymbol);
      if (!stock) return;
      const key = `${contestId}::${stockSymbol}`;
      const existing = stateMap.get(key);
      const nextAvgVolume = existing
        ? Math.round((existing.avgVolume * (1 - VOLUME_EMA_ALPHA) + stock.volume * VOLUME_EMA_ALPHA))
        : stock.volume || 0;

      stateBulkOps.push({
        updateOne: {
          filter: { contestId, stockSymbol },
          update: {
            $setOnInsert: {
              contestStartPrice: stock.price,
              avgVolume: stock.volume || 0,
              lastPrice: stock.price,
              lastVolume: stock.volume || 0
            },
            $set: {
              avgVolume: nextAvgVolume,
              lastPrice: stock.price,
              lastVolume: stock.volume || 0,
              lastUpdated: new Date()
            }
          },
          upsert: true
        }
      });
    });

    if (stateBulkOps.length) {
      await ContestStockState.bulkWrite(stateBulkOps, { ordered: false });
    }

    const refreshedStates = await ContestStockState.find({
      contestId: { $in: contestIds },
      stockSymbol: { $in: symbols }
    }).lean();

    refreshedStates.forEach((state) => {
      stateMap.set(`${state.contestId.toString()}::${state.stockSymbol}`, state);
    });

    const teamIds = teams.map((team) => team._id);
    const milestoneDocs = await TeamStockMilestone.find({
      contestId: { $in: contestIds },
      teamId: { $in: teamIds },
      stockSymbol: { $in: symbols }
    }).lean();

    const milestoneMap = new Map(
      milestoneDocs.map((doc) => [`${doc.teamId.toString()}::${doc.stockSymbol}`, doc])
    );

    const teamPointIncrements = new Map();
    const leaderboardIncrements = new Map();
    const milestoneBulkOps = [];
    const leaderboardTeams = new Map();
    const contestIdsTouched = new Set();

    teams.forEach((team) => {
      const contestId = team.contestId.toString();
      const captainSymbol = team.captain?.stockSymbol;
      const viceSymbol = team.viceCaptain?.stockSymbol;

      team.stocks.forEach((stock) => {
        if (!symbols.includes(stock.stockSymbol)) return;
        const symbol = stock.stockSymbol;
        const stockData = stockMap.get(symbol);
        if (!stockData) return;

        const state = stateMap.get(`${contestId}::${symbol}`);
        if (!state || !state.contestStartPrice) return;

        const percentChange = state.contestStartPrice
          ? ((stockData.price - state.contestStartPrice) / state.contestStartPrice) * 100
          : 0;

        const milestoneKey = `${team._id.toString()}::${symbol}`;
        const milestone = milestoneMap.get(milestoneKey) || {
          teamId: team._id,
          contestId: team.contestId,
          userId: team.userId,
          stockSymbol: symbol,
          action: stock.action,
          lastPercentChange: 0,
          lastComputedPoints: 0,
          milestonesHit: {
            m2: false,
            m5: false,
            m10: false,
            m15: false,
            dayHigh: false,
            dayLow: false,
            volume2x: false,
            volume3x: false
          }
        };

        const scored = calculateStockPoints({
          percentChange,
          previousPercent: milestone.lastPercentChange || 0,
          userAction: stock.action,
          dayHigh: stockData.dayHigh,
          dayLow: stockData.dayLow,
          ltp: stockData.price,
          milestoneFlags: {
            m2: Boolean(milestone.milestonesHit?.m2),
            m5: Boolean(milestone.milestonesHit?.m5),
            m10: Boolean(milestone.milestonesHit?.m10),
            m15: Boolean(milestone.milestonesHit?.m15)
          },
          dayHighHit: Boolean(milestone.milestonesHit?.dayHigh),
          dayLowHit: Boolean(milestone.milestonesHit?.dayLow)
        });

        const nextMilestones = {
          ...(milestone.milestonesHit || {}),
          ...scored.updatedMilestoneFlags,
          dayHigh: scored.dayHighHit,
          dayLow: scored.dayLowHit
        };

        const previousTotal = Number(milestone.lastComputedPoints || 0);
        let pointsDelta = Number(scored.totalPoints) - previousTotal;
        const multiplier = this._getMultiplier(symbol, captainSymbol, viceSymbol);
        if (multiplier !== 1) {
          pointsDelta = pointsDelta * multiplier;
        }

        pointsDelta = Number(pointsDelta.toFixed(2));

        if (pointsDelta !== 0) {
          const current = teamPointIncrements.get(team._id.toString()) || 0;
          teamPointIncrements.set(team._id.toString(), current + pointsDelta);

          const leaderboardKey = `${contestId}::${team._id.toString()}`;
          const leaderboardDelta = leaderboardIncrements.get(leaderboardKey) || 0;
          leaderboardIncrements.set(leaderboardKey, leaderboardDelta + pointsDelta);
          leaderboardTeams.set(leaderboardKey, team);
        }

        milestoneBulkOps.push({
          updateOne: {
            filter: {
              teamId: team._id,
              contestId: team.contestId,
              stockSymbol: symbol
            },
            update: {
              $set: {
                action: stock.action,
                lastPercentChange: percentChange,
                lastComputedPoints: Number(scored.totalPoints),
                milestonesHit: nextMilestones
              },
              $setOnInsert: {
                userId: team.userId
              }
            },
            upsert: true
          }
        });

        contestIdsTouched.add(contestId);
      });
    });

    if (milestoneBulkOps.length) {
      await TeamStockMilestone.bulkWrite(milestoneBulkOps, { ordered: false });
    }

    if (teamPointIncrements.size) {
      const teamBulkOps = [];
      teamPointIncrements.forEach((delta, teamId) => {
        teamBulkOps.push({
          updateOne: {
            filter: { _id: teamId },
            update: { $inc: { totalPoints: delta } }
          }
        });
      });
      await Team.bulkWrite(teamBulkOps, { ordered: false });
    }

    if (leaderboardIncrements.size) {
      const leaderboardOps = [];
      leaderboardIncrements.forEach((delta, key) => {
        const [contestId, teamId] = key.split('::');
        const team = leaderboardTeams.get(key);
        leaderboardOps.push({
          updateOne: {
            filter: { contestId, teamId },
            update: {
              $inc: { points: delta },
              $setOnInsert: {
                userId: team.userId
              }
            },
            upsert: true
          }
        });
      });
      await Leaderboard.bulkWrite(leaderboardOps, { ordered: false });
    }

    if (contestIdsTouched.size) {
      await this._updateLeaderboardRanks([...contestIdsTouched]);
    }

    await this._maybeDistributePrizes(now);

    return { updatedTeams: teamPointIncrements.size, contests: [...contestIdsTouched] };
  }

  _getMultiplier(symbol, captainSymbol, viceSymbol) {
    if (captainSymbol && symbol === captainSymbol) return 2;
    if (viceSymbol && symbol === viceSymbol) return 1.5;
    return 1;
  }

  async _updateLeaderboardRanks(contestIds) {
    const updates = [];
    for (const contestId of contestIds) {
      const entries = await Leaderboard.find({ contestId })
        .sort({ points: -1, updatedAt: 1 })
        .lean();

      let rank = 1;
      entries.forEach((entry) => {
        updates.push({
          updateOne: {
            filter: { _id: entry._id },
            update: { $set: { rank } }
          }
        });
        rank += 1;
      });
    }

    if (updates.length) {
      await Leaderboard.bulkWrite(updates, { ordered: false });
    }
  }

  async _maybeDistributePrizes(now) {
    const currentTime = now || new Date();
    if (currentTime.getTime() - this.lastDistributionCheck < DISTRIBUTION_COOLDOWN_MS) {
      return;
    }
    this.lastDistributionCheck = currentTime.getTime();
    await this.distributeCompletedContests();
  }

  async distributeCompletedContests() {
    const contests = await Contest.find({
      contestEndTime: { $lte: new Date() },
      isPrizeDistributed: false
    }).lean();

    for (const contest of contests) {
      await this._distributePrizesForContest(contest);
    }
  }

  async _distributePrizesForContest(contest) {
    const leaderboardEntries = await Leaderboard.find({ contestId: contest._id })
      .sort({ points: -1 })
      .lean();

    if (!leaderboardEntries.length) {
      return;
    }

    const walletMap = new Map();
    const walletOps = [];
    const leaderboardOps = [];

    let currentRank = 1;
    leaderboardEntries.forEach((entry) => {
      const prizeInfo = contest.prizeBreakup.find(
        (range) => currentRank >= range.rankFrom && currentRank <= range.rankTo
      );

      const winningAmount = prizeInfo ? prizeInfo.prizeEach : 0;

      leaderboardOps.push({
        updateOne: {
          filter: { _id: entry._id },
          update: { $set: { rank: currentRank, winningAmount } }
        }
      });

      if (winningAmount > 0) {
        const existing = walletMap.get(entry.userId.toString()) || 0;
        walletMap.set(entry.userId.toString(), existing + winningAmount);
      }

      currentRank += 1;
    });

    for (const [userId, amount] of walletMap.entries()) {
      walletOps.push({
        updateOne: {
          filter: { userId },
          update: {
            $inc: { balance: amount },
            $push: {
              transactions: {
                type: 'CREDIT',
                amount,
                reason: `Prize for contest ${contest.name}`
              }
            }
          },
          upsert: true
        }
      });
    }

    if (leaderboardOps.length) {
      await Leaderboard.bulkWrite(leaderboardOps, { ordered: false });
    }
    if (walletOps.length) {
      await Wallet.bulkWrite(walletOps, { ordered: false });
    }

    await Contest.updateOne(
      { _id: contest._id },
      { $set: { isPrizeDistributed: true } }
    );
  }
}

module.exports = new StockScoringService();
