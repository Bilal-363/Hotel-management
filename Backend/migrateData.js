const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Models
const User = require('./models/User');
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const Expense = require('./models/Expense');
const Customer = require('./models/Customer');
const Khata = require('./models/Khata');
const KhataTransaction = require('./models/KhataTransaction');
const Supplier = require('./models/Supplier');
const Purchase = require('./models/Purchase');
const DailyLog = require('./models/DailyLog');
const Category = require('./models/Category');
const Trash = require('./models/Trash');

const migrate = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const targetEmail = 'alihamza.baba73@gmail.com';
    console.log(`🔍 Looking for user: ${targetEmail}`);

    let user = await User.findOne({ email: { $regex: new RegExp(`^${targetEmail}$`, 'i') } });

    if (!user) {
      console.log(`⚠️ User ${targetEmail} not found. Searching for any admin with 'alihamza'...`);
      user = await User.findOne({ 
        role: 'admin',
        $or: [{ email: /alihamza/i }, { name: /alihamza/i }] 
      });
    }

    if (!user) {
      console.error('❌ No admin user found to assign data to.');
      console.error('Usage: node migrateData.js <email>');
      process.exit(1);
    }

    console.log(`👤 Assigning data to: ${user.name} (${user.email}) [ID: ${user._id}]`);
    const ownerId = user._id;

    // 1. Update User ownerId if missing
    if (!user.ownerId || user.ownerId.toString() !== user._id.toString()) {
      user.ownerId = user._id;
      await user.save();
      console.log('✅ Updated User ownerId');
    }

    // 2. Update all collections
    const models = [
      { name: 'Product', model: Product },
      { name: 'Sale', model: Sale },
      { name: 'Expense', model: Expense },
      { name: 'Customer', model: Customer },
      { name: 'Khata', model: Khata },
      { name: 'KhataTransaction', model: KhataTransaction },
      { name: 'Supplier', model: Supplier },
      { name: 'Purchase', model: Purchase },
      { name: 'DailyLog', model: DailyLog },
      { name: 'Category', model: Category },
      { name: 'Trash', model: Trash }
    ];

    for (const { name, model } of models) {
      const result = await model.updateMany(
        {}, // Update ALL documents to ensure ownership
        { $set: { owner: ownerId } }
      );
      console.log(`✅ Migrated ${result.matchedCount} ${name}s (Modified: ${result.modifiedCount})`);
    }

    console.log('🎉 Migration Complete! All data is now owned by ' + user.email);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

migrate();