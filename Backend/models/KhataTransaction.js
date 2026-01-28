const mongoose = require('mongoose');

const khataTransactionSchema = new mongoose.Schema({
  khata: { type: mongoose.Schema.Types.ObjectId, ref: 'Khata', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['charge', 'payment'], required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('KhataTransaction', khataTransactionSchema);

