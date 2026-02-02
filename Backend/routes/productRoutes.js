const express = require('express');
const router = express.Router();
const { getAllProducts, getProduct, createProduct, updateProduct, deleteProduct, updateStock, getLowStockProducts } = require('../controllers/productController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', protect, getAllProducts);
router.get('/low-stock', protect, getLowStockProducts);
router.get('/:id', protect, getProduct);
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, authorize('admin', 'superadmin'), deleteProduct);
router.put('/:id/stock', protect, updateStock);

module.exports = router;