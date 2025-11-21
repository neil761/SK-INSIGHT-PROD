const Notification = require("../models/Notification");
const FormStatus = require("../models/FormStatus");

async function getPresentCycle(formName) {
  // Allow "closed but present" cycle (not just open)
  const status = await FormStatus.findOne({ formName }).sort({ isOpen: -1, updatedAt: -1 }).populate("cycleId");
  if (!status || !status.cycleId) return null; // <-- Instead of throw, return null
  return status.cycleId;
}

// Get all notifications for present cycle (with status)
exports.getAllNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    if (!cycle) return res.json([]); // <-- No cycle, just return empty array
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
    })
      .populate({
        path: "referenceId",
        select: "status",
        model: "EducationalAssistance",
      })
      .sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error("getAllNotifications error:", err);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
};

// Get only unread notifications for present cycle (with status)
exports.getUnreadNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    if (!cycle) return res.json([]);
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
    })
      .populate({
        path: "referenceId",
        select: "status firstname middlename surname createdAt",
        model: "EducationalAssistance",
      })
      .sort({ createdAt: -1 });

    const now = Date.now();
    // Filter out overdue notifications (pending > 2 days)
    const response = notifs
      .filter(
        (n) =>
          n.referenceId &&
          (n.referenceId.status !== "pending" ||
            now - new Date(n.referenceId.createdAt).getTime() <= TWO_DAYS_MS)
      )
      .map((n) => ({
        _id: n._id,
        type: n.type,
        event: n.event,
        message: n.message,
        referenceId: n.referenceId?._id || n.referenceId,
        cycleId: n.cycleId,
        createdAt: n.createdAt,
        read: n.read,
        status: n.referenceId?.status || "unknown",
        fullname: n.referenceId
          ? `${n.referenceId.firstname || ""} ${
              n.referenceId.middlename || ""
            } ${n.referenceId.surname || ""}`.trim()
          : "Unknown",
      }));

    res.json(response);
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
    if (!cycle) return res.json({ message: "No notifications to mark as read" });
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

// Get only read notifications for present cycle (with status)
exports.getReadNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    if (!cycle) return res.json([]);
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
      read: true,
    })
      .populate({
        path: "referenceId",
        select: "status",
        model: "EducationalAssistance",
      })
      .sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    console.error("getReadNotifications error:", err);
    res.status(500).json({ error: "Server error fetching read notifications" });
  }
};

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

exports.getOverdueNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    if (!cycle) return res.json([]);
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
      read: false,
    })
      .populate({
        path: "referenceId",
        select: "status firstname middlename surname createdAt",
        model: "EducationalAssistance",
        match: { status: "pending" },
      })
      .sort({ createdAt: -1 });

    const now = Date.now();
    // Filter for those pending > 2 days and flatten format like unread
    const response = notifs
      .filter(
        (n) =>
          n.referenceId &&
          n.referenceId.status === "pending" &&
          now - new Date(n.referenceId.createdAt).getTime() > TWO_DAYS_MS
      )
      .map((n) => ({
        _id: n._id,
        type: n.type,
        event: n.event,
        message: n.message,
        referenceId: n.referenceId?._id || n.referenceId,
        cycleId: n.cycleId,
        createdAt: n.createdAt,
        read: n.read,
        status: n.referenceId?.status || "unknown",
        fullname: n.referenceId
          ? `${n.referenceId.firstname || ""} ${
              n.referenceId.middlename || ""
            } ${n.referenceId.surname || ""}`.trim()
          : "Unknown",
      }));

    res.json(response);
  } catch (err) {
    console.error("getOverdueNotifications error:", err);
    res.status(500).json({ error: "Server error fetching overdue notifications" });
  }
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Get all KK notifications for present cycle
exports.getAllKKNotifications = async (req, res) => {
  const cycle = await getPresentCycle("KK Profiling");
  const notifs = await Notification.find({
    type: "kk-profile",
    cycleId: cycle._id,
  })
    .populate({
      path: "referenceId",
      select: "status firstname middlename lastname submittedAt",
      model: "KKProfile",
    })
    .sort({ createdAt: -1 });
  res.json(notifs);
};

// Get new KK notifications (within 24 hours)
exports.getNewKKNotifications = async (req, res) => {
  const cycle = await getPresentCycle("KK Profiling");
  const now = Date.now();
  const notifs = await Notification.find({
    type: "kk-profile",
    cycleId: cycle._id,
  })
    .populate({
      path: "referenceId",
      select: "status firstname middlename lastname submittedAt isRead", // <-- make sure isRead is selected!
      model: "KKProfile",
    })
    .sort({ createdAt: -1 });

  const newNotifs = notifs.filter(
    (n) =>
      n.referenceId &&
      now - new Date(n.referenceId.submittedAt).getTime() <= ONE_DAY_MS
  );
  res.json(newNotifs);
};

// Get unread KK notifications (older than 24 hours, still unread)
exports.getUnreadKKNotifications = async (req, res) => {
  const cycle = await getPresentCycle("KK Profiling");
  const now = Date.now();
  const notifs = await Notification.find({
    type: "kk-profile",
    cycleId: cycle._id,
  })
    .populate({
      path: "referenceId",
      select: "status firstname middlename lastname submittedAt isRead", // <-- make sure isRead is selected!
      model: "KKProfile",
    })
    .sort({ createdAt: -1 });

  const unreadNotifs = notifs.filter(
    (n) =>
      n.referenceId &&
      (n.referenceId.isRead === false) && // <-- Only unread
      now - new Date(n.referenceId.createdAt || n.referenceId.submittedAt).getTime() > 24 * 60 * 60 * 1000
  );
  res.json(unreadNotifs);
};

// Mark as read
exports.markKKAsRead = async (req, res) => {
  const notif = await Notification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );
  if (!notif) return res.status(404).json({ error: "Notification not found" });
  res.json({ message: "Notification marked as read", notification: notif });
};

// Count of unread KK notifications for present cycle
exports.getUnreadKKNotificationCount = async (req, res) => {
  try {
    const cycle = await getPresentCycle("KK Profiling");
    // Find all notifications for present cycle
    const notifs = await Notification.find({
      type: "kk-profile",
      cycleId: cycle._id,
    }).populate({
      path: "referenceId",
      select: "isRead",
      model: "KKProfile",
    });

    // Count only those where the related KKProfile is not read
    const count = notifs.filter(n => n.referenceId && n.referenceId.isRead === false).length;

    res.json({ count });
  } catch (err) {
    console.error("getUnreadKKNotificationCount error:", err);
    res.status(500).json({ error: "Server error fetching unread notification count" });
  }
};

// Get all LGBTQ notifications for present cycle
exports.getAllLGBTQNotifications = async (req, res) => {
  const cycle = await getPresentCycle("LGBTQIA+ Profiling");
  const notifs = await Notification.find({
    type: "lgbtq-profile",
    cycleId: cycle._id,
  })
    .populate({
      path: "referenceId",
      select: "status firstname middlename lastname submittedAt isRead",
      model: "LGBTQProfile",
    })
    .sort({ createdAt: -1 });
  res.json(notifs);
};

// Get new LGBTQ notifications (within 24 hours, isRead === false)
exports.getNewLGBTQNotifications = async (req, res) => {
  const cycle = await getPresentCycle("LGBTQIA+ Profiling");
  const now = Date.now();
  const notifs = await Notification.find({
    type: "lgbtq-profile",
    cycleId: cycle._id,
  })
    .populate({
      path: "referenceId",
      select: "status firstname middlename lastname submittedAt createdAt isRead",
      model: "LGBTQProfile",
    })
    .sort({ createdAt: -1 });

  const newNotifs = notifs.filter(
    (n) =>
      n.referenceId &&
      (n.referenceId.isRead === false) &&
      now - new Date(n.referenceId.createdAt || n.referenceId.submittedAt).getTime() <= 24 * 60 * 60 * 1000
  );
  res.json(newNotifs);
};

// Get unread LGBTQ notifications (older than 24 hours, isRead === false)
exports.getUnreadLGBTQNotifications = async (req, res) => {
  const cycle = await getPresentCycle("LGBTQIA+ Profiling");
  const now = Date.now();
  const notifs = await Notification.find({
    type: "lgbtq-profile",
    cycleId: cycle._id,
  })
    .populate({
      path: "referenceId",
      select: "status firstname middlename lastname submittedAt createdAt isRead",
      model: "LGBTQProfile",
    })
    .sort({ createdAt: -1 });

  const unreadNotifs = notifs.filter(
    (n) =>
      n.referenceId &&
      (n.referenceId.isRead === false) &&
      now - new Date(n.referenceId.createdAt || n.referenceId.submittedAt).getTime() > 24 * 60 * 60 * 1000
  );
  res.json(unreadNotifs);
};

// Count of unread LGBTQ notifications for present cycle
exports.getUnreadLGBTQNotificationCount = async (req, res) => {
  try {
    const cycle = await getPresentCycle("LGBTQIA+ Profiling");
    const notifs = await Notification.find({
      type: "lgbtq-profile",
      cycleId: cycle._id,
    }).populate({
      path: "referenceId",
      select: "isRead",
      model: "LGBTQProfile",
    });

    const count = notifs.filter(n => n.referenceId && n.referenceId.isRead === false).length;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Server error fetching unread notification count" });
  }
};

// Count of pending Educational Assistance applications for present cycle
exports.getPendingEducationalAssistanceCount = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    // Only count applications with status "pending" and not deleted
    const count = await require("../models/EducationalAssistance").countDocuments({
      formCycle: cycle._id,
      status: "pending",
      isDeleted: { $ne: true }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Server error fetching pending application count" });
  }
};

exports.getNewEducationalApplications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    // Get today's midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all pending applications for the present cycle created today
    const EducationalAssistance = require("../models/EducationalAssistance");
    const newApps = await EducationalAssistance.find({
      formCycle: cycle._id,
      status: "pending",
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });

    res.json(newApps);
  } catch (err) {
    console.error("getNewEducationalApplications error:", err);
    res.status(500).json({ error: "Server error fetching new applications" });
  }
};

// Returns all pending applications for present cycle (regardless of notification read status)
exports.getPendingEducationalNotifications = async (req, res) => {
  try {
    const cycle = await getPresentCycle("Educational Assistance");
    if (!cycle) return res.json([]);
    // Find all notifications for pending applications in the present cycle
    const notifs = await Notification.find({
      type: "educational-assistance",
      cycleId: cycle._id,
    })
      .populate({
        path: "referenceId",
        select: "status firstname middlename surname createdAt typeOfBenefit year grade school email",
        model: "EducationalAssistance",
        match: { status: "pending" }
      })
      .sort({ createdAt: -1 });

    // Only include notifications where the referenced application is still pending
    const filtered = notifs.filter(n => n.referenceId && n.referenceId.status === "pending");

    // Flatten for frontend
    const response = filtered.map(n => ({
      _id: n._id,
      type: n.type,
      event: n.event,
      message: n.message,
      referenceId: n.referenceId?._id || n.referenceId,
      cycleId: n.cycleId,
      createdAt: n.createdAt,
      read: n.read,
      status: n.referenceId?.status || "unknown",
      fullname: n.referenceId
        ? `${n.referenceId.firstname || ""} ${n.referenceId.middlename || ""} ${n.referenceId.surname || ""}`.trim()
        : "Unknown",
      typeOfBenefit: n.referenceId?.typeOfBenefit,
      year: n.referenceId?.year,
      grade: n.referenceId?.grade,
      school: n.referenceId?.school,
      email: n.referenceId?.email
    }));

    res.json(response);
  } catch (err) {
    console.error("getPendingEducationalNotifications error:", err);
    res.status(500).json({ error: "Server error fetching notifications" });
  }
};
