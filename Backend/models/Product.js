const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  size: {
    type: String,
    default: ''
  },
  buyPrice: {
    type: Number,
    required: [true, 'Buy price is required'],
    min: 0
  },
  sellPrice: {
    type: Number,
    required: [true, 'Sell price is required'],
    min: 0
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: 0,
    default: 0
  },
  minStock: {
    type: Number,
    default: 10,
    min: 0
  },
  barcode: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('profit').get(function() {
  return this.sellPrice - this.buyPrice;
});

productSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.minStock;
});

module.exports = mongoose.model('Product', productSchema);