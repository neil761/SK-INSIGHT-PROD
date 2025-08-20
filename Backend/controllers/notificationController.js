const Notification = require("../models/Notification");
const FormStatus = require("../models/FormStatus");

async function getPresentCycle(formName) {
  const status = await FormStatus.findOne({ formName, isOpen: true }).populate(
    "cycleId"
  );
  if (!status || !status.cycleId) throw new Error("No active form cycle");
  return status.cycleId;
}

// Get all notifications for present cycle
exports.getAllNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
    }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error("getAllNotifications error:", err);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
};

// Get only unread notifications for present cycle
exports.getUnreadNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
      read: false,
    }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error("getUnreadNotifications error:", err);
    res
      .status(500)
      .json({ error: "Server error fetching unread notifications" });
  }
};

// Mark a notification as read by ID
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notif)
      return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification marked as read", notification: notif });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating notification" });
  }
};

// Mark all notifications for present cycle as read
exports.markAllAsRead = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    await Notification.updateMany(
      { type: "educational-assistance", cycleId: cycle._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "All notifications marked as read for present cycle" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Server error while updating notifications" });
  }
};

// Get only read notifications for present cycle
exports.getReadNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
      read: true,
    }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error("getReadNotifications error:", err);
    res.status(500).json({ error: "Server error fetching read notifications" });
  }
};
