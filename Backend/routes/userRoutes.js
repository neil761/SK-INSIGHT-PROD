const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userControllers');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', userCtrl.createUser); 

router.get('/me', protect, userCtrl.getCurrentUser);

router.get('/', protect, authorizeRoles('admin'), userCtrl.getUsers);
router.get('/:id', protect, authorizeRoles('admin'), userCtrl.getUserById);
router.put('/:id', protect, authorizeRoles('admin'), userCtrl.updateUser);
router.delete('/:id', protect, authorizeRoles('admin'), userCtrl.deleteUser);
router.post('/verify/send', userCtrl.sendVerificationOtp);
router.post('/verify/confirm', userCtrl.verifyEmailOtp);

module.exports = router;
