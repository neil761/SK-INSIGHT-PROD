const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notificationController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", protect, authorizeRoles("admin"), ctrl.getAllNotifications);
router.get(
  "/unread",
  protect,
  authorizeRoles("admin"),
  ctrl.getUnreadNotifications
);
router.get(
  "/read",
  protect,
  authorizeRoles("admin"),
  ctrl.getReadNotifications
);
router.patch("/:id/read", protect, authorizeRoles("admin"), ctrl.markAsRead);
router.patch("/read-all", protect, authorizeRoles("admin"), ctrl.markAllAsRead);
router.get('/overdue', ctrl.getOverdueNotifications);
router.get('/kk', protect, authorizeRoles("admin"), ctrl.getAllKKNotifications);
router.get('/kk/new', protect, authorizeRoles("admin"), ctrl.getNewKKNotifications);
router.get('/kk/unread', protect, authorizeRoles("admin"), ctrl.getUnreadKKNotifications);
router.get('/kk/unread/count', protect, authorizeRoles("admin"), ctrl.getUnreadKKNotificationCount);
router.patch('/kk/:id/read', protect, authorizeRoles("admin"), ctrl.markKKAsRead);
router.get('/lgbtq', protect, authorizeRoles("admin"), ctrl.getAllLGBTQNotifications);
router.get('/lgbtq/new', protect, authorizeRoles("admin"), ctrl.getNewLGBTQNotifications);
router.get('/lgbtq/unread', protect, authorizeRoles("admin"), ctrl.getUnreadLGBTQNotifications);
router.get('/lgbtq/unread/count', protect, authorizeRoles("admin"), ctrl.getUnreadLGBTQNotificationCount);
router.get('/educational/pending/count', protect, authorizeRoles("admin"), ctrl.getPendingEducationalAssistanceCount);
router.get(
  '/educational/new',
  protect,
  authorizeRoles("admin"),
  ctrl.getNewEducationalApplications
);

module.exports = router;
