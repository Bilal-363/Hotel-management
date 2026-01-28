const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productSize: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  buyPrice: {
    type: Number,
    required: true
  },
  sellPrice: {
    type: Number,
    required: true
  },
  itemTotal: {
    type: Number,
    required: true
  },
  itemProfit: {
    type: Number,
    required: true
  }
});

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: Number,
    required: true,
    unique: true
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  totalProfit: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String, // Payment Type
    enum: ['Cash', 'JazzCash', 'EasyPaisa', 'Card', 'Credit', 'Khata'],
    default: 'Cash'
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  customerPhone: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['completed', 'refunded', 'cancelled'],
    default: 'completed'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  khataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Khata'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  khataRemainingAfterSale: {
    type: Number,
    default: 0
  },
}, {
  timestamps: true
});

saleSchema.statics.getNextInvoiceNumber = async function () {
  const lastSale = await this.findOne().sort({ invoiceNumber: -1 });
  return lastSale ? lastSale.invoiceNumber + 1 : 1001;
};

module.exports = mongoose.model('Sale', saleSchema);