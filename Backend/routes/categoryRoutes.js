const express = require('express');
const router = express.Router();
const { getAllCategories, getProductCategories, getExpenseCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getAllCategories);
router.get('/product', getProductCategories);
router.get('/expense', getExpenseCategories);
router.get('/:id', getCategory);
router.post('/', protect, createCategory);
router.put('/:id', protect, updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;