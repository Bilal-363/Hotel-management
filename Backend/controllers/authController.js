const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/emailService');
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
const Trash = require('../models/Trash');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const user = new User({ name, email, password, role, phone });

    // If Admin, they are their own owner. If Staff, this logic needs to be handled by an "Add Staff" feature later.
    // For now, assuming public signup is for Admins.
    if (role === 'admin') {
      user.ownerId = user._id;
    }
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerId: user.ownerId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetAccountData = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (req.user.email === 'alihamza.baba73@gmail.com') {
      return res.status(403).json({ success: false, message: 'This account is protected and cannot be reset.' });
    }

    const ownerId = req.user.ownerId || req.user._id;
    const query = { $or: [{ owner: ownerId }, { owner: req.user._id }] };
    
    await Promise.all([
      User.deleteMany({ ownerId: ownerId, role: 'staff' }),
      Product.deleteMany(query),
      Sale.deleteMany(query),
      Expense.deleteMany(query),
      Customer.deleteMany(query),
      Khata.deleteMany(query),
      KhataTransaction.deleteMany(query),
      Supplier.deleteMany(query),
      Purchase.deleteMany(query),
      DailyLog.deleteMany(query),
      Category.deleteMany(query),
      Setting.deleteMany(query),
      Trash.deleteMany(query)
    ]);

    res.status(200).json({ success: true, message: 'All account data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetAllOtherAccounts = async (req, res) => {
  // This is a very destructive operation. Double-check that the user is the intended superadmin.
  if (req.user.email !== 'ba2999461@gmail.com') {
    return res.status(403).json({ success: false, message: 'Forbidden: Only the primary superadmin can perform this action.' });
  }

  try {
    const protectedEmail = 'alihamza.baba73@gmail.com';
    let protectedUser = await User.findOne({ email: { $regex: new RegExp(`^${protectedEmail}$`, 'i') } });
    
    if (!protectedUser) {
      return res.status(404).json({ success: false, message: `Protected user ${protectedEmail} not found. Aborting to prevent data loss.` });
    }

    // [DIAGNOSTIC] Count total items in DB to verify if data exists
    const totalProducts = await Product.countDocuments();
    const totalSales = await Sale.countDocuments();

    // [FIX] Ensure protected user is self-owned and admin BEFORE assigning data to them
    // This ensures that when they log in, they actually see the data we are about to give them.
    const updates = {};
    if (protectedUser.ownerId?.toString() !== protectedUser._id.toString()) updates.ownerId = protectedUser._id;
    if (!['admin', 'superadmin'].includes(protectedUser.role)) updates.role = 'admin';
    if (!protectedUser.isActive) updates.isActive = true;

    if (Object.keys(updates).length > 0) {
        // Use updateOne to bypass potential pre-save hooks causing "next is not a function"
        await User.updateOne({ _id: protectedUser._id }, { $set: updates });
        protectedUser = await User.findById(protectedUser._id); // Refresh
    }

    const modelsWithOwner = [Product, Sale, Expense, Customer, Khata, KhataTransaction, Supplier, Purchase, DailyLog, Category, Setting, Trash];
    
    // Helper to migrate data safely, handling duplicate key errors by deleting conflicting source data
    const migrateModel = async (Model) => {
      const docs = await Model.find({ owner: { $ne: protectedUser._id } }).select('_id');
      if (docs.length === 0) return 0;

      const ops = docs.map(doc => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { owner: protectedUser._id } }
        }
      }));

      try {
        // Use ordered: false to continue processing even if some fail (e.g. duplicates)
        const res = await Model.bulkWrite(ops, { ordered: false }).catch(async (err) => {
             // If duplicate key error (code 11000), delete the conflicting source documents
             if (err.writeErrors) {
                const idsToDelete = err.writeErrors
                    .filter(e => e.code === 11000)
                    .map(e => ops[e.index].updateOne.filter._id);
                
                if (idsToDelete.length > 0) {
                    await Model.deleteMany({ _id: { $in: idsToDelete } });
                }
                return err.result;
             }
             throw err;
        });
        return res ? res.nModified : 0;
      } catch (err) {
        throw err;
      }
    };

    let totalMoved = 0;
    let details = [];
    for (const Model of modelsWithOwner) {
      const count = await migrateModel(Model);
      totalMoved += count;
      if (count > 0) details.push(`${Model.modelName}: ${count}`);
    }

    // Handle Staff separately (uses ownerId)
    const staffRes = await User.updateMany(
      { role: 'staff', ownerId: { $ne: protectedUser._id } },
      { $set: { ownerId: protectedUser._id } }
    );
    totalMoved += staffRes.modifiedCount;
    if (staffRes.modifiedCount > 0) details.push(`Staff: ${staffRes.modifiedCount}`);

    const detailMsg = details.length > 0 ? ` (${details.join(', ')})` : '';

    const statusMsg = `Database contains ${totalProducts} Products and ${totalSales} Sales.`;
    res.status(200).json({ success: true, message: `${statusMsg} Moved ${totalMoved} items to ${protectedEmail}${detailMsg}.` });

  } catch (error) {
    console.error('Error resetting all other accounts:', error);
    res.status(500).json({ success: false, message: `Error: ${error.message}` });
  }
};

exports.fixDataOwnership = async (req, res) => {
  // Allow the protected user or super admin to run this fix
  if (!['alihamza.baba73@gmail.com', 'ba2999461@gmail.com'].includes(req.user.email)) {
    return res.status(403).json({ success: false, message: 'Not authorized to perform this action.' });
  }

  try {
    const protectedEmail = 'alihamza.baba73@gmail.com';
    const protectedUser = await User.findOne({ email: { $regex: new RegExp(`^${protectedEmail}$`, 'i') } });
    
    if (!protectedUser) {
      return res.status(404).json({ success: false, message: 'Protected user account not found.' });
    }

    // [DIAGNOSTIC] Count total items in DB to verify if data exists
    const totalProducts = await Product.countDocuments();
    const totalSales = await Sale.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    const totalKhatas = await Khata.countDocuments();

    if (totalProducts === 0 && totalSales === 0 && totalCustomers === 0 && totalKhatas === 0) {
         return res.status(200).json({ 
            success: true, 
            message: `⚠️ Database is EMPTY.\n\n- Products: 0\n- Sales: 0\n- Khatas: 0\n\nThe restore process may have failed, or the backup file you used was empty.` 
        });
    }

    const modelsWithOwner = [Product, Sale, Expense, Customer, Khata, KhataTransaction, Supplier, Purchase, DailyLog, Category, Setting, Trash];
    let totalMatched = 0;
    let totalModified = 0;

    for (const Model of modelsWithOwner) {
      // Update ALL documents to belong to the protected user
      // We use updateMany with empty filter {} to target EVERYTHING in the collection
      const result = await Model.updateMany({}, { $set: { owner: protectedUser._id } });
      totalMatched += result.matchedCount || 0;
      totalModified += result.modifiedCount || 0;
    }

    // Fix Staff ownership
    const staffRes = await User.updateMany(
      { role: 'staff' },
      { $set: { ownerId: protectedUser._id } }
    );
    totalMatched += staffRes.matchedCount || 0;
    totalModified += staffRes.modifiedCount || 0;

    let statusMessage = `Database Status:\n- Products: ${totalProducts}\n- Sales: ${totalSales}\n- Customers: ${totalCustomers}\n- Khatas: ${totalKhatas}\n\n`;
    if (totalModified === 0) {
        statusMessage += `✅ VERIFIED: All data is already correctly owned by ${protectedEmail}. No changes needed.`;
    } else {
        statusMessage += `✅ FIXED: Moved ${totalModified} items to ${protectedEmail}.`;
    }

    res.status(200).json({ 
      success: true, 
      message: statusMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.createBackup = async (req, res) => {
  try {
    // If Super Admin, backup EVERYTHING. If Admin, backup only their data.
    const isSuperAdmin = req.user.role === 'superadmin';
    const query = isSuperAdmin ? {} : { $or: [{ owner: req.user.ownerId || req.user._id }, { owner: { $exists: false } }, { owner: null }] };

    const data = {
      timestamp: new Date().toISOString(),
      products: await Product.find(query),
      sales: await Sale.find(query),
      expenses: await Expense.find(query),
      customers: await Customer.find(query),
      khatas: await Khata.find(query),
      khataTransactions: await KhataTransaction.find(query),
      suppliers: await Supplier.find(query),
      purchases: await Purchase.find(query),
      dailyLogs: await DailyLog.find(query),
      categories: await Category.find(query),
      settings: await Setting.find(query),
      trash: await Trash.find(query),
      users: await User.find(query)
    };

    res.json(data);
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.emergencyRecover = async (req, res) => {
  try {
    const protectedEmail = 'alihamza.baba73@gmail.com';
    const user = await User.findOne({ email: { $regex: new RegExp(`^${protectedEmail}$`, 'i') } });
    if (!user) throw new Error('Target user (Ali Hamza) not found');

    const ownerId = user._id;
    let restoredFromTrash = 0;
    let reassignedCount = 0;
    let reactivatedCount = 0;

    // 1. Try to restore anything found in the Trash collection
    const trashItems = await Trash.find({});
    for (const item of trashItems) {
      try {
        // Dynamically load model based on collection name stored in Trash
        let Model;
        try {
            // Try exact match
            Model = require(`../models/${item.collectionName}`);
        } catch (e) {
            // Try singular/capitalized (e.g. 'products' -> 'Product')
            try {
                const name = item.collectionName.charAt(0).toUpperCase() + item.collectionName.slice(1).replace(/s$/, '');
                Model = require(`../models/${name}`);
            } catch (e2) {}
        }

        if (Model) {
          // Restore item, assigning it to Ali Hamza
          const dataToRestore = { ...item.data, owner: ownerId };
          delete dataToRestore._id; // Let MongoDB assign a new ID to avoid conflicts
          
          await Model.create(dataToRestore);
          restoredFromTrash++;
          await Trash.findByIdAndDelete(item._id); // Clean up trash
        }
      } catch (err) {
        console.error(`Failed to restore trash item: ${err.message}`);
      }
    }

    // 2. Force-assign ALL existing data in the database to Ali Hamza
    const models = [Product, Sale, Expense, Customer, Khata, KhataTransaction, Supplier, Purchase, DailyLog, Category, Setting];
    for (const Model of models) {
      // Force ownership to Ali Hamza
      const res = await Model.updateMany({}, { $set: { owner: ownerId } });
      reassignedCount += res.modifiedCount;

      // Reactivate any soft-deleted items (specifically Products)
      if (Model.modelName === 'Product') {
         const activeRes = await Model.updateMany({ isActive: false }, { $set: { isActive: true } });
         reactivatedCount += activeRes.modifiedCount;
      }
    }

    // 3. Fix Staff Accounts
    await User.updateMany(
        { role: 'staff' },
        { $set: { ownerId: ownerId } }
    );

    const totalKhatas = await Khata.countDocuments();

    res.json({ success: true, message: `Recovery Report:\n- Restored from Trash: ${restoredFromTrash}\n- Reassigned to Account: ${reassignedCount}\n- Reactivated Hidden Items: ${reactivatedCount}\n- Total Khatas Found: ${totalKhatas}\n\nAll found data is now in Ali Hamza's account.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message
      });

      res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerId: user.ownerId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Self-heal check for specific super admin to prevent lockout
    if (user && (user.email === 'ba2999461@gmail.com' || user.email === 'alihamza.baba73@gmail.com')) {
      const updates = {};
      if (!user.isActive) updates.isActive = true;
      
      // Ensure super admin owns themselves (fixes data leakage issues)
      if (!user.ownerId || user.ownerId.toString() !== user._id.toString()) updates.ownerId = user._id;
      
      if (user.email === 'ba2999461@gmail.com' && user.role !== 'superadmin') updates.role = 'superadmin';
      
      // Ensure alihamza is at least admin so they can own data
      if (user.email === 'alihamza.baba73@gmail.com' && !['admin', 'superadmin'].includes(user.role)) updates.role = 'admin';
      
      if (Object.keys(updates).length > 0) {
        // Use updateOne to bypass potential pre-save hooks causing "next is not a function"
        await User.updateOne({ _id: user._id }, { $set: updates });
        // Refresh user object in memory for the response
        const updatedUser = await User.findById(user._id);
        user.role = updatedUser.role;
        user.ownerId = updatedUser.ownerId;
        user.isActive = updatedUser.isActive;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerId: user.ownerId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.getAllUsers = async (req, res) => {
  try {
    const query = req.user.role === 'superadmin' ? {} : { ownerId: req.user.ownerId };
    const users = await User.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { action } = req.query;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email === 'alihamza.baba73@gmail.com' || user.email === 'ba2999461@gmail.com') {
      return res.status(403).json({ success: false, message: 'This account is protected and cannot be deleted or deactivated.' });
    }

    if (req.user.role !== 'superadmin') {
      if (user.ownerId.toString() !== req.user.ownerId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this user' });
      }
    }

    if (action === 'deactivate') {
      await User.findByIdAndUpdate(req.params.id, { isActive: false });
      return res.status(200).json({ success: true, message: 'User deactivated' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.loginAsUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });

    // Generate token for the target user
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerId: user.ownerId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Determine Role and Owner
    let userRole = role;
    let ownerId = req.user.ownerId;

    if (req.user.role !== 'superadmin') {
      // Regular admins can only create staff
      userRole = 'staff';
      ownerId = req.user.ownerId; // Assign to current admin
    }

    const user = new User({ name, email, password, role: userRole, phone, ownerId });

    // If creating an Admin/SuperAdmin, they own themselves. If Staff, they are owned by creator.
    if (userRole === 'admin' || userRole === 'superadmin') {
      user.ownerId = user._id;
    }

    await user.save();

    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetTargetUserData = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email === 'alihamza.baba73@gmail.com') {
      return res.status(403).json({ success: false, message: 'This account is protected and cannot be reset.' });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Can only reset data for Admin accounts' });
    }

    const ownerId = user.ownerId || user._id;
    const query = { $or: [{ owner: ownerId }, { owner: user._id }] };
    
    await Promise.all([
      User.deleteMany({ ownerId: ownerId, role: 'staff' }),
      Product.deleteMany(query),
      Sale.deleteMany(query),
      Expense.deleteMany(query),
      Customer.deleteMany(query),
      Khata.deleteMany(query),
      KhataTransaction.deleteMany(query),
      Supplier.deleteMany(query),
      Purchase.deleteMany(query),
      DailyLog.deleteMany(query),
      Category.deleteMany(query),
      Setting.deleteMany(query),
      Trash.deleteMany(query)
    ]);

    res.status(200).json({ success: true, message: 'User data reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.timestamp) {
      return res.status(400).json({ success: false, message: 'Invalid backup file format' });
    }

    const ownerId = req.user.ownerId || req.user._id;
    const isSuperAdmin = req.user.role === 'superadmin';

    const restoreCollection = async (Model, items) => {
      if (!items || !Array.isArray(items)) return;
      for (const item of items) {
        if (!isSuperAdmin) item.owner = ownerId;
        if (item._id) {
          await Model.findByIdAndUpdate(item._id, item, { upsert: true });
        } else {
          await Model.create(item);
        }
      }
    };

    await restoreCollection(Product, data.products);
    await restoreCollection(Sale, data.sales);
    await restoreCollection(Expense, data.expenses);
    await restoreCollection(Customer, data.customers);
    await restoreCollection(Khata, data.khatas);
    await restoreCollection(KhataTransaction, data.khataTransactions);
    await restoreCollection(Supplier, data.suppliers);
    await restoreCollection(Purchase, data.purchases);
    await restoreCollection(DailyLog, data.dailyLogs);
    await restoreCollection(Category, data.categories);
    await restoreCollection(Setting, data.settings);

    res.status(200).json({ success: true, message: 'Restore completed successfully' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};