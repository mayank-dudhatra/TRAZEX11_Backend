const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  stockSymbol: { type: String, required: true },
  action: { type: String, enum: ['BUY', 'SELL'], required: true }
}, { _id: false });

const teamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  stocks: [stockSchema],
  captain: stockSchema,
  viceCaptain: stockSchema,
  totalPoints: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

teamSchema.index({ contestId: 1, userId: 1 });

module.exports = mongoose.model('Team', teamSchema);
