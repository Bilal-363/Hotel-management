const express = require('express');
const router = express.Router();
const { createOrUpdateLog, getLogs, deleteLog } = require('../controllers/dailyLogController');

router.post('/', createOrUpdateLog);
router.get('/', getLogs);
router.delete('/:id', deleteLog);

module.exports = router;