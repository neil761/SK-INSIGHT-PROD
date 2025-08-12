const express = require("express");
const router = express.Router();
const kkProfileCtrl = require('../controllers/kkProfileController');
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  submitKKProfile,
  getAllKKProfiles,
  getProfileById,
  updateProfileById,
  deleteProfileById,
  exportProfilesToExcel,
  getMyProfile,
  getProfileImage,
  filterProfilesByCycle,
} = require("../controllers/kkProfileController");

const upload = require("../middleware/uploadProfileImage");

// Static routes (must come before dynamic :id)
router.get("/me", protect, getMyProfile);
router.get("/me/image", protect, getProfileImage);

// Admin-only routes
router.get("/all", protect, authorizeRoles("admin"), getAllKKProfiles);
router.get("/export", protect, authorizeRoles("admin"), exportProfilesToExcel);
router.get('/filter', protect, kkProfileCtrl.filterProfilesByCycle);

// Profile submission with image
router.post(
  "/",
  protect,
  upload.single("profileImage"), // handles multipart/form-data
  submitKKProfile
);

router.get("/cycle", protect, authorizeRoles("admin"), filterProfilesByCycle);

// Admin or Owner can manage a specific profile
router.get("/:id", protect, authorizeRoles("admin"), getProfileById);
router.put("/:id", protect, updateProfileById); // owner or admin
router.delete("/:id", protect, authorizeRoles("admin"), deleteProfileById);

module.exports = router;
