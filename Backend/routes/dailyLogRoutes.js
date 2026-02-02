const express = require('express');
const router = express.Router();
const { createOrUpdateLog, getLogs, deleteLog } = require('../controllers/dailyLogController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createOrUpdateLog);
router.get('/', protect, getLogs);
router.delete('/:id', protect, deleteLog);

module.exports = router;