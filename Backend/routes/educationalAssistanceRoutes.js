const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/educationalAssistanceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = require("../middleware/signatureUploadMiddleware"); // or your custom middleware
const uploadIdEduc = require("../middleware/idEducUploadMiddleware");
const uploadCOE = require("../middleware/coeUploadMiddleware");
const uploadVoterCert = require("../middleware/VotersCertUploadMiddleware");

// ===== User Routes =====
router.post(
  "/",
  protect,
  // use the id middleware to handle front/back, coe middleware for coe, voter middleware for voter's cert
  // call idEduc.fields for front/back, and individual .single for COE and Voter
upload.fields([
  { name: "voter", maxCount: 1 },
  { name: "coeImage", maxCount: 1 },
  { name: "frontImage", maxCount: 1 },
  { name: "backImage", maxCount: 1 }
]),
  ctrl.submitApplication 
);
router.get("/me", protect, ctrl.getMyApplication);

// ===== Admin Routes =====
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
router.get(
  "/status",
  protect,
  authorizeRoles("admin"),
  ctrl.getApplicationsByStatus
);
router.get(
  "/cycles-and-present",
  protect,
  authorizeRoles("admin"),
  ctrl.getCyclesAndPresent
);
router.get(
  "/export/excel",
  protect,
  authorizeRoles("admin"),
  ctrl.exportApplicationsToExcel
);

// ID-specific admin routes — keep these LAST to avoid conflicts
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin"),
  ctrl.updateApplicationStatus
);
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getApplicationById);
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteApplication);

module.exports = router;
