const mongoose = require('mongoose');

const prizeBreakupSchema = new mongoose.Schema({
  rankFrom: {
    type: Number,
    required: true
  },
  rankTo: {
    type: Number,
    required: true
  },
  winners: {
    type: Number,
    required: true
  },
  prizeEach: {
    type: Number,
    required: true
  },
  totalPrize: {
    type: Number,
    required: true
  }
}, { _id: false });

const contestSchema = new mongoose.Schema({
  dateContestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DateContest',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  marketType: {
    type: String,
    enum: ['NSE', 'BSE'],
    default: undefined
  },
  contestDurationType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: undefined
  },
  contestDate: {
    type: Date,
    default: undefined
  },
  contestStartTime: {
    type: Date,
    required: true
  },
  contestEndTime: {
    type: Date,
    required: true
  },
  entryCloseTime: {
    type: Date,
    required: true
  },
  entryFee: {
    type: Number,
    required: true
  },
  totalSpots: {
    type: Number,
    required: true
  },
  filledSpots: {
    type: Number,
    default: 0
  },
  maximumTeamPerUser: {
    type: Number,
    required: true
  },
  prizePool: {
    type: Number,
    required: true
  },
  prizeBreakup: [prizeBreakupSchema],
  joinedTeams: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
  }],
  status: {
    type: String,
    enum: ['Upcoming', 'Live', 'Completed'],
    default: 'Upcoming'
  },
  isCancelled: {
    type: Boolean,
    default: false
  },
  isPrizeDistributed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

contestSchema.index({ dateContestId: 1 });

module.exports = mongoose.model('Contest', contestSchema);
