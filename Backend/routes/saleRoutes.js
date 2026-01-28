const express = require('express');
const router = express.Router();
const { getAllSales, getSale, createSale, getTodaySales, getSaleByInvoice, refundSale, deleteSale } = require('../controllers/saleController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', protect, getAllSales);
router.get('/today', protect, getTodaySales);
router.get('/invoice/:invoiceNumber', protect, getSaleByInvoice);
router.get('/:id', protect, getSale);
router.post('/', optionalAuth, createSale);
router.put('/:id/refund', protect, refundSale);

router.delete('/:id', protect, deleteSale); // Add deleteSale

module.exports = router;