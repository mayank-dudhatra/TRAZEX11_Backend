const Stock = require("../models/Stock");
const moment = require("moment-timezone");

/**
 * Daily Stock Scoring Service
 * 
 * Calculates buyPoints and sellPoints for stocks based on their daily performance.
 * This is for display in the Screener - separate from contest scoring.
 * 
 * Scoring Rules:
 * - Directional Points: ±1 point per 0.1% change from basePrice
 * - Milestones: 2%→+10, 5%→+25, 10%→+60, 15%→+120 (awarded once per day)
 * - Day High: +20 points (BUY only)
 * - Day Low: +10 points (SELL only)
 * - Volume Spikes: 2x avg→+5, 3x avg→+10
 */

class DailyStockScoringService {
  constructor() {
    this.MILESTONE_BONUSES = [
      { key: "m2", threshold: 2, points: 10 },
      { key: "m5", threshold: 5, points: 25 },
      { key: "m10", threshold: 10, points: 60 },
      { key: "m15", threshold: 15, points: 120 }
    ];
  }

  /**
   * Reset all stocks at 9:00 AM IST
   * Sets basePrice to current price and resets all daily fields
   */
  async resetDailyScores() {
    try {
      const now = new Date();
      const istTime = moment(now).tz("Asia/Kolkata");
      
      console.log(`[DailyStockScoring] Resetting daily scores at ${istTime.format("HH:mm:ss")}`);

      const result = await Stock.updateMany(
        { isActive: true },
        [
          {
            $set: {
              basePrice: {
                $cond: [
                  { $gt: ["$previousClose", 0] },
                  "$previousClose",
                  "$price"
                ]
              },
              buyPoints: 0,
              sellPoints: 0,
              dailyBuyPoints: 0,
              dailySellPoints: 0,
              dailyBaseVolume: "$volume",
              dailyPreviousPercent: 0,
              lastDailyReset: now,
              lastResetDate: now,
              dailyMilestones: {
                m2: false,
                m5: false,
                m10: false,
                m15: false,
                dayHigh: false,
                dayLow: false,
                volume2x: false,
                volume3x: false
              },
              dailyMilestonesHit: {
                m2: false,
                m5: false,
                m10: false,
                m15: false,
                dayHigh: false,
                dayLow: false,
                volume2x: false,
                volume3x: false
              }
            }
          }
        ]
      );

      console.log(`[DailyStockScoring] Reset completed for ${result.modifiedCount} stocks`);
      return { success: true, count: result.modifiedCount };
    } catch (error) {
      console.error("[DailyStockScoring] Reset failed:", error);
      throw error;
    }
  }

  /**
   * Calculate daily points for updated stocks
   * Called after stock price updates
   */
  async calculateDailyPoints(updatedStocks = [], io = null) {
    try {
      if (!updatedStocks || updatedStocks.length === 0) {
        return { success: true, updated: 0 };
      }

      const updatedSymbols = updatedStocks
        .map((item) => {
          if (!item) return null;
          if (typeof item === "string") return item;
          return item.symbol || null;
        })
        .filter(Boolean);

      if (!updatedSymbols.length) {
        return { success: true, updated: 0 };
      }

      const stocks = await Stock.find({
        symbol: { $in: updatedSymbols },
        isActive: true,
        basePrice: { $exists: true, $ne: null }
      });

      if (stocks.length === 0) {
        return { success: true, updated: 0 };
      }

      const bulkOps = [];

      for (const stock of stocks) {
        const scoring = this._calculateStockScore(stock);
        
        if (scoring) {
          bulkOps.push({
            updateOne: {
              filter: { _id: stock._id },
              update: {
                $set: {
                  buyPoints: scoring.buyPoints,
                  sellPoints: scoring.sellPoints,
                  dailyBuyPoints: scoring.buyPoints,
                  dailySellPoints: scoring.sellPoints,
                  dailyMilestones: scoring.milestones,
                  dailyMilestonesHit: scoring.milestones,
                  percentChange: scoring.percentChange,
                  dailyPreviousPercent: scoring.nextPreviousPercent
                }
              }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        await Stock.bulkWrite(bulkOps);
        console.log(`[DailyStockScoring] Updated ${bulkOps.length} stocks`);

        if (io) {
          const freshStocks = await Stock.find({ symbol: { $in: updatedSymbols } })
            .select("symbol name price change percentChange volume dailyBuyPoints dailySellPoints dailyMilestonesHit buyPoints sellPoints dailyMilestones")
            .lean();

          freshStocks.forEach((stock) => {
            io.to(stock.symbol).emit("stockUpdate", stock);
          });
        }
      }

      return { success: true, updated: bulkOps.length };
    } catch (error) {
      console.error("[DailyStockScoring] Calculation failed:", error);
      throw error;
    }
  }

  /**
   * Calculate score for a single stock
   * @private
   */
  _calculateStockScore(stock) {
    if (!stock.basePrice || stock.basePrice <= 0) {
      return null;
    }

    const currentPrice = stock.price || 0;
    const basePrice = stock.basePrice;
    const percentChange = ((currentPrice - basePrice) / basePrice) * 100;
    const previousPercent = Number(stock.dailyPreviousPercent || 0);

    // 1 point per 0.1% movement units
    const directionalPoints = Math.floor(Math.abs(percentChange) / 0.1);

    // Correct direction: +1 per unit; wrong direction: -0.5 per unit
    let buyPoints = 0;
    let sellPoints = 0;

    if (percentChange > 0) {
      buyPoints = directionalPoints;
      sellPoints = directionalPoints * -0.5;
    } else if (percentChange < 0) {
      sellPoints = directionalPoints;
      buyPoints = directionalPoints * -0.5;
    }

    const milestoneResult = this._applyMilestoneBonuses({
      previousPercent,
      percentChange,
      milestoneSource: stock.dailyMilestonesHit || stock.dailyMilestones || {}
    });

    buyPoints += milestoneResult.buyBonus;
    sellPoints += milestoneResult.sellBonus;

    return {
      buyPoints: Number(buyPoints.toFixed(2)),
      sellPoints: Number(sellPoints.toFixed(2)),
      percentChange,
      milestones: milestoneResult.milestones,
      nextPreviousPercent: percentChange
    };
  }

  _applyMilestoneBonuses({ previousPercent, percentChange, milestoneSource }) {
    let buyBonus = 0;
    let sellBonus = 0;

    const milestones = {
      m2: Boolean(milestoneSource.m2),
      m5: Boolean(milestoneSource.m5),
      m10: Boolean(milestoneSource.m10),
      m15: Boolean(milestoneSource.m15),
      dayHigh: Boolean(milestoneSource.dayHigh),
      dayLow: Boolean(milestoneSource.dayLow),
      volume2x: Boolean(milestoneSource.volume2x),
      volume3x: Boolean(milestoneSource.volume3x)
    };

    for (const milestone of this.MILESTONE_BONUSES) {
      const { key, threshold, points } = milestone;
      if (milestones[key]) {
        continue;
      }

      // First-cross only logic
      const buyCross = previousPercent < threshold && percentChange >= threshold;
      const sellCross = previousPercent > -threshold && percentChange <= -threshold;

      if (buyCross) {
        buyBonus += points;
        milestones[key] = true;
      } else if (sellCross) {
        sellBonus += points;
        milestones[key] = true;
      }
    }

    return {
      buyBonus,
      sellBonus,
      milestones
    };
  }

  /**
   * Get detailed scoring breakdown for a stock (for debugging/display)
   */
  async getStockScoreBreakdown(symbol) {
    try {
      const stock = await Stock.findOne({ symbol, isActive: true });
      
      if (!stock || !stock.basePrice) {
        return null;
      }

      const currentPrice = stock.price || 0;
      const basePrice = stock.basePrice;
      const percentChange = ((currentPrice - basePrice) / basePrice) * 100;
      const directionalPoints = Math.floor(Math.abs(percentChange) / 0.1);

      return {
        symbol: stock.symbol,
        name: stock.name,
        basePrice: stock.basePrice,
        currentPrice: stock.price,
        percentChange: percentChange.toFixed(2),
        directionalPoints,
        buyPoints: stock.dailyBuyPoints,
        sellPoints: stock.dailySellPoints,
        milestones: stock.dailyMilestonesHit,
        previousPercent: stock.dailyPreviousPercent
      };
    } catch (error) {
      console.error("[DailyStockScoring] Breakdown failed:", error);
      throw error;
    }
  }
}

module.exports = new DailyStockScoringService();
