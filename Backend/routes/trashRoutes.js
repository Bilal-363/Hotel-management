const express = require('express');
const router = express.Router();
const Trash = require('../models/Trash');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');

// Get all trash items
router.get('/', protect, async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id;
    const query = req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
    const items = await Trash.find(query).sort({ deletedAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    console.error('Trash GET Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Restore item
router.post('/restore/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const trashItem = await Trash.findOne(query);
    if (!trashItem) return res.status(404).json({ success: false, message: 'Item not found' });

    const Model = mongoose.models[trashItem.collectionName];
    if (!Model) return res.status(400).json({ success: false, message: `Model ${trashItem.collectionName} not found` });

    // Restore data
    await Model.create({ ...trashItem.data, owner: req.user.ownerId || req.user._id });

    // Remove from trash
    await Trash.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Restored successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Permanent Delete
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    await Trash.findOneAndDelete(query);
    res.json({ success: true, message: 'Permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Empty Trash
router.delete('/', protect, async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    await Trash.deleteMany(query);
    res.json({ success: true, message: 'Trash emptied' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;