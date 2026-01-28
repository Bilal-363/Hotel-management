const express = require('express');
const router = express.Router();
const { getAllExpenses, getExpense, createExpense, updateExpense, deleteExpense, getTodayExpenses, getExpenseSummary } = require('../controllers/expenseController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', protect, getAllExpenses);
router.get('/today', protect, getTodayExpenses);
router.get('/summary', protect, getExpenseSummary);
router.get('/:id', protect, getExpense);
router.post('/', optionalAuth, createExpense);
router.put('/:id', protect, updateExpense);
router.delete('/:id', protect, deleteExpense);

module.exports = router;