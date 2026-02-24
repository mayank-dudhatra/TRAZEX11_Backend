const mongoose = require('mongoose');

const milestonesSchema = new mongoose.Schema({
  m2: { type: Boolean, default: false },
  m5: { type: Boolean, default: false },
  m10: { type: Boolean, default: false },
  m15: { type: Boolean, default: false },
  dayHigh: { type: Boolean, default: false },
  dayLow: { type: Boolean, default: false },
  volume2x: { type: Boolean, default: false },
  volume3x: { type: Boolean, default: false }
}, { _id: false });

const teamStockMilestoneSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stockSymbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  action: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  lastPercentChange: {
    type: Number,
    default: 0
  },
  lastComputedPoints: {
    type: Number,
    default: 0
  },
  milestonesHit: {
    type: milestonesSchema,
    default: () => ({})
  }
}, { timestamps: true });

teamStockMilestoneSchema.index({ contestId: 1, teamId: 1, stockSymbol: 1 }, { unique: true });

module.exports = mongoose.model('TeamStockMilestone', teamStockMilestoneSchema);
