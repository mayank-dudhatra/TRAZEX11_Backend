const mongoose = require('mongoose');

const contestStockStateSchema = new mongoose.Schema({
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
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
  contestStartPrice: {
    type: Number,
    required: true,
    min: 0
  },
  avgVolume: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  lastVolume: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

contestStockStateSchema.index({ contestId: 1, stockSymbol: 1 }, { unique: true });

module.exports = mongoose.model('ContestStockState', contestStockStateSchema);
