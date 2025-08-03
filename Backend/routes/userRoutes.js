const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userControllers');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const idUpload = require('../middleware/idUploadMiddleware');


// 📌 Public Routes

router.post('/smart/register', idUpload, userCtrl.smartRegister);
router.post('/', userCtrl.createUser); // Fallback/manual creation (optional)
router.post('/verify/send', userCtrl.sendVerificationOtp);
router.post('/verify/confirm', userCtrl.verifyEmailOtp);

// 📌 Authenticated User Route
router.get('/me', protect, userCtrl.getCurrentUser);

// 📌 Admin-only Routes
router.get('/', protect, authorizeRoles('admin'), userCtrl.getUsers);
router.get('/:id', protect, authorizeRoles('admin'), userCtrl.getUserById);
router.put('/:id', protect, authorizeRoles('admin'), userCtrl.updateUser);
router.delete('/:id', protect, authorizeRoles('admin'), userCtrl.deleteUser);

module.exports = router;
