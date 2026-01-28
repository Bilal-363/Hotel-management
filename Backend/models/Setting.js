const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  storeName: {
    type: String,
    default: 'Haji Waris Ali Hotel'
  },
  storeAddress: {
    type: String,
    default: ''
  },
  storePhone: {
    type: String,
    default: ''
  },
  storeEmail: {
    type: String,
    default: ''
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  currencySymbol: {
    type: String,
    default: 'Rs.'
  },
  taxRate: {
    type: Number,
    default: 0
  },
  receiptFooter: {
    type: String,
    default: 'Thank You! Please Visit Again!'
  },
  lowStockAlert: {
    type: Number,
    default: 10
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);