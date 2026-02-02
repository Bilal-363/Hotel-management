const express = require('express');
const router = express.Router();
const { getAllCategories, getProductCategories, getExpenseCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getAllCategories);
router.get('/product', protect, getProductCategories);
router.get('/expense', protect, getExpenseCategories);
router.get('/:id', protect, getCategory);
router.post('/', protect, createCategory);
router.put('/:id', protect, updateCategory);
router.delete('/:id', protect, authorize('admin', 'superadmin'), deleteCategory);

module.exports = router;