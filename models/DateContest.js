const mongoose = require('mongoose');

const dateContestSchema = new mongoose.Schema({
  contestDurationType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  marketType: {
    type: String,
    enum: ['NSE', 'BSE'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

dateContestSchema.index({ startDate: 1, marketType: 1 });

dateContestSchema.pre('validate', function setDateOrder(next) {
  if (!this.startDate || !this.endDate) return next();
  if (this.endDate < this.startDate) {
    return next(new Error('End date must be on or after start date'));
  }
  return next();
});

module.exports = mongoose.model('DateContest', dateContestSchema);
