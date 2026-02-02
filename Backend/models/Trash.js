const mongoose = require('mongoose');

const trashSchema = new mongoose.Schema({
  collectionName: { type: String, required: true }, // e.g., 'Supplier', 'Purchase'
  originalId: { type: mongoose.Schema.Types.ObjectId },
  data: { type: Object, required: true }, // The full deleted document
  deletedAt: { type: Date, default: Date.now },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Prevent OverwriteModelError during hot reloads
module.exports = mongoose.models.Trash || mongoose.model('Trash', trashSchema);