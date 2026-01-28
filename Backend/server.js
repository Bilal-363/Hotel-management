const path = require('path'); // Server Restart Triggered v2
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

const app = express();

// Database Connect
connectDB();

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/khata', require('./routes/khataRoutes'));
app.use('/api/dailylogs', require('./routes/dailyLogRoutes'));

// 404 Handler
// Serve Frontend Static Files in Production
// Serve Frontend Static Files in Production
// (path, isPkg, basePath already defined at top)

const frontendPath = path.join(basePath, 'frontend');
app.use(express.static(frontendPath));

// Handle React Routing (return index.html for all non-API routes)
app.get(/(.*)/, (req, res) => {
  // If it's an API call that wasn't handled, it will fall through to 404 via next() 
  // actually 'get *' catches everything. We need to be careful.
  // Better approach: Check if it starts with /api
  if (req.url.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API Route not found'
    });
  }

  // Check if file exists, if not send index.html
  // Express static already handles files. So this is just for SPA routing.
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ [SERVER ERROR]:', err);
  res.status(500).json({
    success: false,
    message: 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Routes loaded: /api/auth, /api/sales, etc.`);
});

module.exports = app;