const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // UPDATED: Use Cloud URI as fallback for packaged app reliability
    const dbURI = process.env.MONGO_URI || 'mongodb+srv://alihamzababa73:02QMwnqe1iU7ojyx@cluster0.qjnjj7s.mongodb.net/?appName=Cluster0';

    const conn = await mongoose.connect(dbURI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;