const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userControllers');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/idUploadMiddleware');
const path = require('path');
const fs = require('fs');
const { changePassword, sendChangeEmailOtp, changeEmail } = require("../controllers/userControllers");

router.post(
  "/smart/register",                 
  userCtrl.smartRegister
);

router.post('/', userCtrl.createUser); // Fallback/manual creation (optional)
router.post('/verify/send', userCtrl.sendVerificationOtp);
router.post('/verify/confirm', userCtrl.verifyEmailOtp);

// 📌 Authenticated User Route
router.get('/me', protect, userCtrl.getCurrentUser);

// PUT /api/users/agree  -> mark current user's agreement accepted
// Ensure this is NOT behind any authorizeRoles('admin') middleware
router.put('/agree', protect, userCtrl.acceptAgreement);

// Admin-only routes (keep authorizeRoles on them)
router.get('/', protect, authorizeRoles('admin'), userCtrl.getUsers);
router.get('/:id', protect, authorizeRoles('admin'), userCtrl.getUserById);
router.put('/:id', protect, authorizeRoles('admin'), userCtrl.updateUser);
router.delete('/:id', protect, authorizeRoles('admin'), userCtrl.deleteUser);

router.get('/profile-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../uploads/profile_images', filename);

  fs.access(imagePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ error: 'Image not found' });
    res.sendFile(imagePath);
  });
});

router.post("/change-password", protect, changePassword);
router.post("/change-email/send-otp", protect, sendChangeEmailOtp);
router.post("/change-email/verify-otp", protect, userCtrl.verifyChangeEmailOtp); // <-- new
router.post("/change-email", protect, changeEmail);
router.post("/change-email/unverified", protect, userCtrl.changeEmailUnverified);
router.post("/me/update-info", protect, userCtrl.updateMyInfo);

router.post('/create-admin', userCtrl.createAdmin);

// PUT /api/users/agree  -> mark current user's agreement accepted
router.put('/agree', protect, userCtrl.acceptAgreement);

module.exports = router;
