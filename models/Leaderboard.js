const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  rank: Number,
  winningAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

leaderboardSchema.index({ contestId: 1, rank: 1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
