const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date, default: null },
  note: { type: String, default: '' },
  status: { type: String, enum: ['due', 'paid', 'partial'], default: 'due' }
}, { timestamps: true });

const khataSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  title: { type: String, required: true, trim: true },
  totalAmount: { type: Number, required: true },
  remainingAmount: { type: Number, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  installments: [installmentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Khata', khataSchema);

