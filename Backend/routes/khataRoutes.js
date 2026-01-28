const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const khataCtrl = require('../controllers/khataController');

// Customers
router.get('/customers', protect, khataCtrl.getCustomers);
router.post('/customers', protect, khataCtrl.createCustomer);
router.get('/customers/:id/history', protect, khataCtrl.getCustomerHistory);
router.put('/customers/:id', protect, khataCtrl.updateCustomer);
router.delete('/customers/:id', protect, khataCtrl.deleteCustomer);

// Khata
router.post('/', protect, khataCtrl.createKhata);
router.get('/', protect, khataCtrl.getKhatas);
router.get('/:id', protect, khataCtrl.getKhata);
router.put('/:id', protect, khataCtrl.updateKhata);
router.delete('/:id', protect, khataCtrl.deleteKhata);
router.post('/:id/charge', protect, khataCtrl.addCharge);
router.post('/:id/installments', protect, khataCtrl.addInstallments);

router.put('/installments/:installmentId/pay', protect, khataCtrl.payInstallment);
router.get('/due-installments/list', protect, khataCtrl.getDueInstallments);
router.delete('/transactions/:id', protect, khataCtrl.deleteTransaction);

module.exports = router;
