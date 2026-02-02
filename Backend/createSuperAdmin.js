const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const createSuperAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'ba2999461@gmail.com'; // Set your email
    const password = 'admin123'; // Set your password

    const exists = await User.findOne({ email });
    if (exists) {
      console.log('⚠️ User already exists. Removing old account...');
      await User.deleteOne({ _id: exists._id });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const _id = new mongoose.Types.ObjectId();
    
    // Use collection.insertOne to bypass Mongoose middleware and prevent double-hashing
    await User.collection.insertOne({
      _id,
      name: 'Super Developer',
      email,
      password: hashedPassword,
      role: 'superadmin',
      phone: '03000000000',
      isActive: true,
      ownerId: _id,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });

    console.log('🚀 Super Admin Created Successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

createSuperAdmin();