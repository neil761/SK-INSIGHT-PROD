const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/lgbtqProfileController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer();
const uploadLGBTQIdImage = require("../middleware/uploadLGBTQIdImage");

// === USER ROUTES ===
// Submit new LGBTQ profile
router.post(
  "/",
  protect,
  (req, res, next) => {
    uploadLGBTQIdImage.single("idImage")(req, res, function (err) {
      if (err) {
        // Always return JSON for Multer errors
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  ctrl.submitLGBTQProfile
);

// Get logged-in user's own profile
router.get("/me/profile", protect, ctrl.getMyProfile);

// === ADMIN ROUTES ===
// Export profiles to Excel
router.get(
  "/export/excel",
  protect,
  authorizeRoles("admin"),
  ctrl.exportProfilesToExcel
);

// Filter profiles by cycle
router.get(
  "/filter",
  protect,
  authorizeRoles("admin"),
  ctrl.filterProfilesByCycle
);

// Get all profiles
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllProfiles);

// Get single profile by ID
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getProfileById);

// Update profile by ID
router.put("/:id", protect, authorizeRoles("admin"), ctrl.updateProfileById);

// Delete profile by ID
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteProfileById);

module.exports = router;
