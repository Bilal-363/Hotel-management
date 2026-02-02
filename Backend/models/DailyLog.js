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
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DailyLog', DailyLogSchema);