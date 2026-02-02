const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { generateBackupData } = require('../utils/backupGenerator');
const { uploadToDrive, listBackups, getFileContent } = require('../utils/driveService');

// Import all models
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const Khata = require('../models/Khata');
const KhataTransaction = require('../models/KhataTransaction');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const DailyLog = require('../models/DailyLog');
const Category = require('../models/Category');
const Setting = require('../models/Setting');
const User = require('../models/User');
const Trash = require('../models/Trash');

// Helper: Restore Logic
const restoreDatabase = async (data, ownerId) => {
  const { 
    products, sales, expenses, customers, khatas, khataTransactions, 
    suppliers, purchases, dailyLogs, categories, settings, trash
  } = data;

  // 1. Clear existing data (Except Users to prevent lockout)
  await Promise.all([
    Product.deleteMany({ owner: ownerId }),
    Sale.deleteMany({ owner: ownerId }),
    Expense.deleteMany({ owner: ownerId }),
    Customer.deleteMany({ owner: ownerId }),
    Khata.deleteMany({ owner: ownerId }),
    KhataTransaction.deleteMany({ owner: ownerId }),
    Supplier.deleteMany({ owner: ownerId }),
    Purchase.deleteMany({ owner: ownerId }),
    DailyLog.deleteMany({ owner: ownerId }),
    Category.deleteMany({ owner: ownerId }),
    Setting.deleteMany({ owner: ownerId }),
    Trash.deleteMany({ owner: ownerId })
  ]);

  // 2. Insert Backup Data (Force current ownerId)
  if (products?.length) await Product.insertMany(products.map(i => ({ ...i, owner: ownerId })));
  if (sales?.length) await Sale.insertMany(sales.map(i => ({ ...i, owner: ownerId })));
  if (expenses?.length) await Expense.insertMany(expenses.map(i => ({ ...i, owner: ownerId })));
  if (customers?.length) await Customer.insertMany(customers.map(i => ({ ...i, owner: ownerId })));
  if (khatas?.length) await Khata.insertMany(khatas.map(i => ({ ...i, owner: ownerId })));
  if (khataTransactions?.length) await KhataTransaction.insertMany(khataTransactions.map(i => ({ ...i, owner: ownerId })));
  if (suppliers?.length) await Supplier.insertMany(suppliers.map(i => ({ ...i, owner: ownerId })));
  if (purchases?.length) await Purchase.insertMany(purchases.map(i => ({ ...i, owner: ownerId })));
  if (dailyLogs?.length) await DailyLog.insertMany(dailyLogs.map(i => ({ ...i, owner: ownerId })));
  if (categories?.length) await Category.insertMany(categories.map(i => ({ ...i, owner: ownerId })));
  if (settings?.length) await Setting.insertMany(settings.map(i => ({ ...i, owner: ownerId })));
  if (trash?.length) await Trash.insertMany(trash.map(i => ({ ...i, owner: ownerId })));
};

router.get('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const ownerId = req.user.role === 'superadmin' ? null : (req.user.ownerId || req.user._id);
    const backup = await generateBackupData(ownerId);

    res.json(backup);
  } catch (err) {
    console.error('Backup Error:', err);
    res.status(500).json({ success: false, message: 'Backup failed' });
  }
});

router.post('/drive', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const ownerId = req.user.role === 'superadmin' ? null : (req.user.ownerId || req.user._id);
    const backup = await generateBackupData(ownerId);
    const result = await uploadToDrive(backup);
    res.json({ success: true, message: 'Uploaded to Google Drive', fileId: result.id });
  } catch (err) {
    console.error('Drive Upload Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/drive/list', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const files = await listBackups();
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/drive/restore/:fileId', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const backupData = await getFileContent(req.params.fileId);
    if (!backupData) throw new Error('Failed to download file');
    
    await restoreDatabase(backupData, req.user.ownerId || req.user._id);
    res.json({ success: true, message: 'Restored from Drive successfully' });
  } catch (err) {
    console.error('Drive Restore Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/restore', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    await restoreDatabase(req.body, req.user.ownerId || req.user._id);
    res.json({ success: true, message: 'Restore successful' });
  } catch (err) {
    console.error('Restore Error:', err);
    res.status(500).json({ success: false, message: 'Restore failed: ' + err.message });
  }
});

module.exports = router;