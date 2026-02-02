const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Trash = require('../models/Trash');
const { protect } = require('../middleware/authMiddleware');

// Get all purchases
router.get('/', protect, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id;
    const query = req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
    const purchases = await Purchase.find(query)
      .populate('supplier', 'name')
      .sort({ date: -1 });
    res.json({ success: true, purchases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Purchase
router.post('/', protect, async (req, res) => {
  try {
    const { supplierId, items, totalAmount, paidAmount, invoiceNumber, date } = req.body;

    // 1. Create Purchase Record
    const purchase = new Purchase({
      supplier: supplierId,
      items,
      totalAmount,
      paidAmount,
      invoiceNumber,
      date: date || Date.now(),
      owner: req.user.ownerId || req.user._id
    });
    await purchase.save();

    // 2. Update Supplier Balance (We owe them Total - Paid)
    const balanceChange = Number(totalAmount) - Number(paidAmount);
    if (balanceChange !== 0) {
      await Supplier.findByIdAndUpdate(supplierId, { $inc: { balance: balanceChange } });
    }

    // 3. Update Product Stock & Buy Price
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
        $set: { buyPrice: item.buyPrice } // Update to latest buying price
      });
    }

    res.json({ success: true, purchase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete Purchase
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const purchase = await Purchase.findOne(query);
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });

    // 1. Reverse Supplier Balance
    const balanceChange = Number(purchase.totalAmount) - Number(purchase.paidAmount);
    if (balanceChange !== 0) {
      await Supplier.findByIdAndUpdate(purchase.supplier, { $inc: { balance: -balanceChange } });
    }

    // 2. Reverse Product Stock
    for (const item of purchase.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    await Trash.create({
      collectionName: 'Purchase',
      originalId: purchase._id,
      data: purchase.toObject(),
      owner: req.user.ownerId || req.user._id // Trash belongs to deleter
    });

    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Purchase deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;