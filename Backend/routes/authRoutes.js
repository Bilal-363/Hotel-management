const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, getAllUsers, updateUser, deleteUser, forgotPassword, resetPassword, loginAsUser, resetAccountData, createUser, resetTargetUserData, resetAllOtherAccounts, fixDataOwnership, createBackup, emergencyRecover } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.get('/users', protect, authorize('admin', 'superadmin'), getAllUsers);
router.put('/users/:id', protect, authorize('admin', 'superadmin'), updateUser);
router.delete('/users/:id', protect, authorize('admin', 'superadmin'), deleteUser);
router.delete('/reset-data', protect, authorize('admin'), resetAccountData);
router.post('/users/:id/login-as', protect, authorize('superadmin'), loginAsUser);
router.post('/users', protect, authorize('admin', 'superadmin'), createUser);
router.delete('/users/:id/reset-data', protect, authorize('superadmin'), resetTargetUserData);
router.post('/reset-all-other-accounts', protect, authorize('superadmin'), resetAllOtherAccounts);
router.post('/fix-data-ownership', protect, authorize('admin', 'superadmin'), fixDataOwnership);
router.get('/backup', protect, authorize('admin', 'superadmin'), createBackup);
router.post('/emergency-recover', protect, authorize('admin', 'superadmin'), emergencyRecover);

module.exports = router;