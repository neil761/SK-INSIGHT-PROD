const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/educationalAssistanceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/signatureUploadMiddleware"); // for signature file

// User
router.post("/", protect, upload.single("signature"), ctrl.submitApplication);
router.get("/me", protect, ctrl.getMyApplication);

// Admin
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllApplications);
router.get(
  "/cycle",
  protect,
  authorizeRoles("admin"),
  ctrl.filterApplicationsByCycle
);
router.get(
  "/filter",
  protect,
  authorizeRoles("admin"),
  ctrl.filterApplications
);
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getApplicationById);
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteApplication);

module.exports = router;
