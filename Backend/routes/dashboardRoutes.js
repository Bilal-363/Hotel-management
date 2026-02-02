const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentSales, getLowStockAlert, getSalesReport } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/recent-sales', protect, getRecentSales);
router.get('/low-stock', protect, getLowStockAlert);
router.get('/sales-report', protect, getSalesReport);

module.exports = router;