const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentSales, getLowStockAlert, getSalesReport } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', getDashboardStats);
router.get('/recent-sales', getRecentSales);
router.get('/low-stock', getLowStockAlert);
router.get('/sales-report', protect, getSalesReport);

module.exports = router;