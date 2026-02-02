const path = require('path'); // Server Restart Triggered v29
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;

require('dotenv').config({ path: path.join(basePath, '.env') });
console.log('✅ Loaded ENV Keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('Program')));
console.log('✅ JWT_SECRET status:', process.env.JWT_SECRET ? 'Defined' : 'MISSING');

// 🛡️ SAFETY NET: Fallback if .env fails
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: using fallback JWT_SECRET');
  process.env.JWT_SECRET = 'haji_waris_fallback_secret_key_2025_secure';
}
if (!process.env.JWT_EXPIRE) process.env.JWT_EXPIRE = '30d';


const express = require('express');
const cors = require('cors'); // ✅ Standard CORS package
const connectDB = require('./config/db');
const cron = require('node-cron');
const { generateBackupData } = require('./utils/backupGenerator');
const { uploadToDrive, isDriveConfigured } = require('./utils/driveService');
const sendEmail = require('./utils/emailService');

const app = express();

// Database Connect
connectDB();
console.log('✅ Attempting to connect to MongoDB...');

// ✅ STANDARD CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:5173', // Local Frontend
  'http://localhost:5000', // Local Backend
  'https://haji-waris-hotel-and-trader-9pvl.vercel.app',
  'https://haji-waris-hotel-and-trader-vercel.app',
  'https://haji-waris-hotel-and-trader.vercel.app',
  'https://haji-waris-hotel-and-trader-git-main-hotels-projects-712cd3ce.vercel.app' // Vercel Preview
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🔍 DEBUG LOGGER (Must be before routes)
app.use((req, res, next) => {
  console.log(`➡️  [REQUEST] ${req.method} ${req.url}`);
  next();
});

// Test Route
app.get('/', (req, res) => {
  res.json({
    message: 'Hotel POS API V2 is running',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Health Check Route (To verify API is reachable)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is healthy', timestamp: new Date() });
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const saleRoutes = require('./routes/saleRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const khataRoutes = require('./routes/khataRoutes');
const dailyLogRoutes = require('./routes/dailyLogRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const trashRoutes = require('./routes/trashRoutes');
const backupRoutes = require('./routes/backupRoutes');

// Mount routes with /api prefix (Standard)
app.use('/api/auth', authRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/khata', khataRoutes);
app.use('/api/dailylogs', dailyLogRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/backup', backupRoutes);

// Mount routes WITHOUT /api prefix (Fallback for frontend config mismatch)
console.log('✅ Mounting Auth Routes at /auth and /api/auth');
app.use('/auth', authRoutes);
app.use('/sales', saleRoutes);
app.use('/categories', categoryRoutes);
app.use('/products', productRoutes);
app.use('/expenses', expenseRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/khata', khataRoutes);
app.use('/dailylogs', dailyLogRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/purchases', purchaseRoutes);
app.use('/trash', trashRoutes);
app.use('/backup', backupRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
  console.log(`⚠️ [404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'API Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ [SERVER ERROR]:', err);
  res.status(500).json({
    success: false,
    message: 'Server Error'
  });
});

// 🕒 Scheduled Backups
const performBackup = async (type) => {
  if (isDriveConfigured && !isDriveConfigured()) {
    console.log(`ℹ️  Skipping ${type} backup: Google Drive not configured (service-account.json missing).`);
    return;
  }

  console.log(`⏳ Starting ${type} backup to Google Drive...`);
  try {
    const data = await generateBackupData();
    const result = await uploadToDrive(data, type);
    console.log(`✅ ${type} Backup Successful! File ID: ${result.id}`);
  } catch (err) {
    console.error(`❌ ${type} Backup Failed:`, err.message);
    // Send Failure Email
    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USERNAME;
      if (adminEmail) {
        await sendEmail({
          email: adminEmail,
          subject: `❌ Backup Failed: ${type}`,
          message: `The automated ${type} backup failed.\n\nError: ${err.message}\n\nTime: ${new Date().toLocaleString()}`
        });
        console.log('📧 Failure notification email sent.');
      }
    } catch (emailErr) {
      console.error('Failed to send failure notification email:', emailErr.message);
    }
  }
};

// Daily (Every day at midnight)
cron.schedule('0 0 * * *', () => performBackup('daily'));

// Weekly (Every Sunday at midnight)
cron.schedule('0 0 * * 0', () => performBackup('weekly'));

// Monthly (1st of every month at midnight)
cron.schedule('0 0 1 * *', () => performBackup('monthly'));

// Handle Unhandled Promise Rejections (Prevents silent crashes)
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Routes loaded: /api/auth, /api/sales, etc.`);
});

module.exports = app;