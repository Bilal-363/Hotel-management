const mongoose = require('mongoose');

const DailyLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  note: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DailyLog', DailyLogSchema);