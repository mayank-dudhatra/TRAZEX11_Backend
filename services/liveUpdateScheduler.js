const stockService = require('./stockService');
const Stock = require('../models/Stock');
const stockScoringService = require('./stockScoringService');
const dailyStockScoringService = require('./dailyStockScoringService');
const cron = require('node-cron');
const moment = require('moment-timezone');

/**
 * Live Update Scheduler
 * Manages periodic stock data updates and WebSocket broadcasts
 * Runs stock updates every 7-10 seconds and emits to connected clients
 */

class LiveUpdateScheduler {
  constructor(io) {
    this.io = io;
    this.updateInterval = null;
    this.isRunning = false;
    this.UPDATE_FREQUENCY = 5000;
    this.dailyResetTask = null;
  }

  /**
   * Start the live update scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Live update scheduler already running');
      return;
    }

    console.log('🚀 Starting live update scheduler...');
    this.isRunning = true;

    // Initial stock setup
    this._initialize();

    // Periodic updates
    this.updateInterval = setInterval(() => {
      this._updateCycle();
    }, this.UPDATE_FREQUENCY);

    // Daily reset at 9:00 AM IST
    this._startDailyReset();

    console.log(`✅ Live update scheduler started (interval: ${this.UPDATE_FREQUENCY}ms)`);
  }

  /**
   * Stop the live update scheduler
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.isRunning = false;
      console.log('❌ Live update scheduler stopped');
    }

    if (this.dailyResetTask) {
      this.dailyResetTask.stop();
      console.log('❌ Daily reset task stopped');
    }
  }

  /**
   * Initialize default stocks on startup
   */
  async _initialize() {
    try {
      const count = await Stock.countDocuments({ isActive: true });
      
      if (count < 10) {
        console.log('📦 Initializing default stocks...');
        await stockService.initializeDefaultStocks();
      } else {
        console.log(`✅ Found ${count} active stocks in database`);
      }

      await this._ensureTodayReset();
    } catch (error) {
      console.error('❌ Initialization error:', error.message);
    }
  }

  /**
   * Main update cycle - runs periodically
   */
  async _updateCycle() {
    try {
      const result = await stockService.updateActiveStocks(this.io, null, { emitRawUpdates: false });
      
      // Process contest scoring
      if (result?.changedStocks?.length) {
        await stockScoringService.processStockUpdates(result.changedStocks);
      } else {
        await stockScoringService.processStockUpdates([]);
      }

      // Process daily stock points for Screener
      if (result?.changedStocks?.length) {
        await dailyStockScoringService.calculateDailyPoints(result.changedStocks, this.io);
      }

      console.log(`Update cycle complete: ${result.updated} stocks updated`);
    } catch (error) {
      console.error('Update cycle error:', error.message);
    }
  }

  /**
   * Start daily reset cron job at 9:00 AM IST
   */
  _startDailyReset() {
    // Cron: 0 9 * * * = Every day at 9:00 AM IST
    // Using IST timezone
    this.dailyResetTask = cron.schedule('0 9 * * *', async () => {
      const istTime = moment().tz('Asia/Kolkata');
      console.log(`[DailyReset] Triggered at ${istTime.format('YYYY-MM-DD HH:mm:ss')} IST`);
      
      try {
        await dailyStockScoringService.resetDailyScores();
        console.log('[DailyReset] Successfully reset all stock daily scores');
      } catch (error) {
        console.error('[DailyReset] Failed:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    console.log('✅ Daily reset cron job scheduled for 9:00 AM IST');
  }

  async _ensureTodayReset() {
    const nowIst = moment().tz('Asia/Kolkata');
    const resetHourPassed = nowIst.hour() >= 9;
    if (!resetHourPassed) {
      return;
    }

    const latestResetStock = await Stock.findOne({ isActive: true })
      .sort({ lastResetDate: -1 })
      .select('lastResetDate')
      .lean();

    const lastReset = latestResetStock?.lastResetDate
      ? moment(latestResetStock.lastResetDate).tz('Asia/Kolkata')
      : null;

    if (!lastReset || !lastReset.isSame(nowIst, 'day')) {
      console.log('[DailyReset] No reset found for today after 9:00 AM IST, running startup reset');
      await dailyStockScoringService.resetDailyScores();
    }
  }

  /**
   * Force update specific stocks
   */
  async forceUpdateStocks(symbols) {
    try {
      const result = await stockService.updateActiveStocks(this.io, symbols);
      return result;
    } catch (error) {
      console.error('Force update error:', error.message);
      return null;
    }
  }

  /**
   * Get current stats
   */
  async getStats() {
    try {
      return await stockService.getStockStats();
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return {};
    }
  }
}

module.exports = LiveUpdateScheduler;
