const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/lgbtqProfileController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// User submission
router.post('/', protect, upload.single('idImage'), ctrl.submitLGBTQProfile);

// Admin
router.get('/', protect, authorizeRoles('admin'), ctrl.getAllProfiles);
router.get('/:id', protect, authorizeRoles('admin'), ctrl.getProfileById);
router.put('/:id', protect, authorizeRoles('admin'), ctrl.updateProfileById);
router.delete('/:id', protect, authorizeRoles('admin'), ctrl.deleteProfileById);
router.get('/export/excel', protect, authorizeRoles('admin'), ctrl.exportProfilesToExcel);

// Logged-in user view
router.get('/me/profile', protect, ctrl.getMyProfile);

module.exports = router;
