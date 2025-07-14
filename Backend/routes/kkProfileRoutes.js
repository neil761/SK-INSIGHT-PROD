const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const {
  submitKKProfile,
  getAllProfiles,
  getProfileById,
  updateProfileById,
  deleteProfileById,
  exportProfilesToExcel,
  getMyProfile,
  getProfileImage
} = require('../controllers/kkProfileController');

const upload = require('../middleware/uploadProfileImage');

//Must come BEFORE any dynamic route like /:id
router.get('/me', protect, getMyProfile);
router.get('/me/image', protect, getProfileImage);

//Admin-only routes
router.get('/all', protect, authorizeRoles('admin'), getAllProfiles);
router.get('/export', protect, authorizeRoles('admin'), exportProfilesToExcel);

//Profile submission with image
router.post(
  '/',
  protect,
  upload.single('profileImage'), // handles multipart/form-data
  submitKKProfile
);

//Admin or Owner can manage a specific profile
router.get('/:id', protect, authorizeRoles('admin'), getProfileById);
router.put('/:id', protect, updateProfileById); // owner or admin
router.delete('/:id', protect, authorizeRoles('admin'), deleteProfileById);

module.exports = router;
