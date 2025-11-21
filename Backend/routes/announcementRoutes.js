const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/announcementController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/myannouncements", protect, ctrl.getMyAnnouncements);
// Admin only
router.post("/", protect, authorizeRoles("admin"), ctrl.createAnnouncement);
router.put("/:id", protect, authorizeRoles("admin"), ctrl.updateAnnouncement);
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteAnnouncement);
router.patch("/:id/pin", protect, authorizeRoles("admin"), ctrl.pinAnnouncement);

// Public/Protected view
router.get("/", protect, ctrl.getAllAnnouncements);
router.get("/:id", protect, ctrl.getAnnouncementById);

// Mark as viewed (user)
router.post("/:id/view", protect, ctrl.viewAnnouncement);

// My announcements


module.exports = router;

