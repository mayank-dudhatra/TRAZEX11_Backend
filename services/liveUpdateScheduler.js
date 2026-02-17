const stockService = require('./stockService');
const Stock = require('../models/Stock');

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
    } catch (error) {
      console.error('❌ Initialization error:', error.message);
    }
  }

  /**
   * Main update cycle - runs periodically
   */
  async _updateCycle() {
    try {
      const result = await stockService.updateActiveStocks(this.io);
      console.log(`Update cycle complete: ${result.updated} stocks updated`);
    } catch (error) {
      console.error('Update cycle error:', error.message);
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
