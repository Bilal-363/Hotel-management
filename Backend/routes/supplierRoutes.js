const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const Trash = require('../models/Trash');
const { protect } = require('../middleware/authMiddleware');

// Get all suppliers
router.get('/', protect, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id;
    const query = req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
    const suppliers = await Supplier.find(query).sort({ name: 1 });
    res.json({ success: true, suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create supplier
router.post('/', protect, async (req, res) => {
  try {
    const supplier = new Supplier({ ...req.body, owner: req.user.ownerId || req.user._id });
    await supplier.save();
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update supplier
router.put('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, $or: [{ owner: req.user.ownerId || req.user._id }, { owner: { $exists: false } }, { owner: null }] },
      req.body,
      { new: true }
    );
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete supplier
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const supplier = await Supplier.findOne(query);
    if (supplier) {
      await Trash.create({
        collectionName: 'Supplier',
        originalId: supplier._id,
        data: supplier.toObject(),
        owner: req.user.ownerId || req.user._id // Trash belongs to deleter
      });
      await Supplier.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Record Payment to Supplier
router.post('/:id/payment', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, $or: [{ owner: req.user.ownerId || req.user._id }, { owner: { $exists: false } }, { owner: null }] },
      { $inc: { balance: -Number(amount) } }, 
      { new: true }
    );
    res.json({ success: true, supplier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;