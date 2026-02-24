const mongoose = require("mongoose");

const pricePointSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const stockSchema = new mongoose.Schema({

  // 🔹 Basic Info
  symbol: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    uppercase: true
  }, // Example: RELIANCE.NS / RELIANCE.BO

  name: {
    type: String,
    required: true,
    trim: true
  },

  exchange: {
    type: String,
    enum: ["NSE", "BSE"],
    required: true,
    index: true
  },

  sector: {
    type: String,
    trim: true
  },

  industry: {
    type: String,
    trim: true
  },

  marketCap: {
    type: Number,
    min: 0,
    sparse: true
  },

  image: {
    type: String,
    sparse: true
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  isIndexStock: {
    type: Boolean,
    default: false,
    index: true
  },

  // 🔹 Live Market Data (Updated frequently)
  price: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },

  change: {
    type: Number,
    default: 0
  },

  percentChange: {
    type: Number,
    default: 0,
    index: true
  },

  volume: {
    type: Number,
    min: 0,
    default: 0,
    index: true
  },

  openPrice: {
    type: Number,
    min: 0,
    sparse: true
  },

  previousClose: {
    type: Number,
    min: 0,
    sparse: true
  },

  dayHigh: {
    type: Number,
    min: 0,
    sparse: true
  },

  dayLow: {
    type: Number,
    min: 0,
    sparse: true
  },

  week52High: {
    type: Number,
    min: 0,
    sparse: true
  },

  week52Low: {
    type: Number,
    min: 0,
    sparse: true
  },

  low7Day: {
    type: Number,
    min: 0,
    sparse: true
  },

  high7Day: {
    type: Number,
    min: 0,
    sparse: true
  },

  low30Day: {
    type: Number,
    min: 0,
    sparse: true
  },

  high30Day: {
    type: Number,
    min: 0,
    sparse: true
  },

  low180Day: {
    type: Number,
    min: 0,
    sparse: true
  },

  high180Day: {
    type: Number,
    min: 0,
    sparse: true
  },

  lastTradeTime: {
    type: Date,
    sparse: true
  },

  // 🔹 Fantasy Related Fields
  buyPoints: {
    type: Number,
    default: 0
  },

  sellPoints: {
    type: Number,
    default: 0
  },

  // Price snapshot at contest start (important for scoring)
  contestStartPrice: {
    type: Number,
    min: 0,
    sparse: true
  },

  // 🔹 Daily Stock Points System
  basePrice: {
    type: Number,
    min: 0,
    sparse: true
  }, // 9:00 AM price for daily scoring

  dailyBuyPoints: {
    type: Number,
    default: 0
  },

  dailySellPoints: {
    type: Number,
    default: 0
  },

  dailyMilestones: {
    m2: { type: Boolean, default: false },  // 2% milestone
    m5: { type: Boolean, default: false },  // 5% milestone
    m10: { type: Boolean, default: false }, // 10% milestone
    m15: { type: Boolean, default: false }, // 15% milestone
    dayHigh: { type: Boolean, default: false },
    dayLow: { type: Boolean, default: false },
    volume2x: { type: Boolean, default: false },
    volume3x: { type: Boolean, default: false }
  },

  dailyMilestonesHit: {
    m2: { type: Boolean, default: false },
    m5: { type: Boolean, default: false },
    m10: { type: Boolean, default: false },
    m15: { type: Boolean, default: false },
    dayHigh: { type: Boolean, default: false },
    dayLow: { type: Boolean, default: false },
    volume2x: { type: Boolean, default: false },
    volume3x: { type: Boolean, default: false }
  },

  dailyBaseVolume: {
    type: Number,
    min: 0,
    sparse: true
  }, // EMA volume for spike detection

  lastDailyReset: {
    type: Date,
    sparse: true
  },

  lastResetDate: {
    type: Date,
    sparse: true
  },

  dailyPreviousPercent: {
    type: Number,
    default: 0
  },

  // 🔹 Intraday Graph (Keep Last 100 entries, updated every 5-10 seconds)
  dailyGraph: {
    type: [pricePointSchema],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 200; // Keep max 200 data points
      },
      message: 'Daily graph cannot have more than 200 data points'
    }
  },

  // 🔹 System Tracking
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },

  // For tracking update frequency
  updateCount: {
    type: Number,
    default: 0
  },

  // Error tracking
  lastError: {
    type: String,
    sparse: true
  },

  lastErrorTime: {
    type: Date,
    sparse: true
  }

}, {
  timestamps: true
});

// 🔥 Performance Indexes
stockSchema.index({ exchange: 1, symbol: 1 }, { unique: true });
stockSchema.index({ exchange: 1, isActive: 1 });
stockSchema.index({ percentChange: -1 });
stockSchema.index({ volume: -1 });
stockSchema.index({ marketCap: -1 });
stockSchema.index({ lastUpdated: -1 });
stockSchema.index({ symbol: 1, lastUpdated: -1 });

// ✨ Virtuals
stockSchema.virtual('priceIncrease').get(function() {
  return this.price - this.previousClose;
});

stockSchema.virtual('yearChange').get(function() {
  if (!this.week52Low || !this.week52High) return 0;
  return ((this.price - this.week52Low) / (this.week52High - this.week52Low)) * 100;
});

// Ensure virtuals are serialized
stockSchema.set('toJSON', { virtuals: true });
stockSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Stock", stockSchema);
