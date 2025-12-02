const EducationalAssistance = require("../models/EducationalAssistance");
const FormCycle = require("../models/FormCycle");
const sendRejectionEmail = require("../utils/sendRejectionEmail");
const Notification = require("../models/Notification");
const FormStatus = require("../models/FormStatus");
const ExcelJS = require('exceljs'); // Make sure to install: npm install exceljs
const path = require("path");
const fs = require("fs");
    const Announcement = require("../models/Announcement");
const cloudinary = require("../config/cloudinaryConfig");
async function getPresentCycle(formName) {
  // 1) Prefer an explicitly open cycle
  const openStatus = await FormStatus.findOne({ formName, isOpen: true }).populate("cycleId");
  if (openStatus && openStatus.cycleId) return openStatus.cycleId;

  // 2) No open cycle — treat the most recent FormStatus (even if closed) as present
  const anyStatus = await FormStatus.findOne({ formName }).sort({ updatedAt: -1 }).populate("cycleId");
  if (anyStatus && anyStatus.cycleId) return anyStatus.cycleId;

  // 3) Final fallback: return latest FormCycle document (by year, cycleNumber)
  const latestCycle = await FormCycle.findOne({ formName }).sort({ year: -1, cycleNumber: -1 });
  if (latestCycle) return latestCycle;

  throw new Error("No active form cycle");
}

// Submit application
exports.submitApplication = async (req, res) => {
  try {
    const userId = req.user.id;

    
    if (req.user.accessLevel === "limited" || req.user.age > 30) {
      return res.status(403).json({ error: "You are not eligible to submit this form due to age restrictions." });
    }
    // Check if form is open
    const formStatus = await FormStatus.findOne({
      formName: "Educational Assistance",
    });
    if (!formStatus || !formStatus.isOpen) {
      return res.status(403).json({ error: "Form is currently closed" });
    }

    // ✅ Get latest application in this cycle
    const latestApp = await EducationalAssistance.findOne({
      user: userId,
      formCycle: formStatus.cycleId,
    }).sort({ createdAt: -1 });

    // ✅ Only allow resubmission after rejection
    if (latestApp && latestApp.status === "pending") {
      return res.status(409).json({
        error: "You already have a pending application for this cycle",
      });
    }
    if (latestApp && latestApp.status === "approved") {
      return res.status(409).json({
        error: "You have already been approved for this cycle",
      });
    }

    // Parse arrays if they're strings
    if (typeof req.body.siblings === 'string') {
      req.body.siblings = JSON.parse(req.body.siblings);
    }
    if (typeof req.body.expenses === 'string') {
      req.body.expenses = JSON.parse(req.body.expenses);
    }

    if (!Array.isArray(req.body.siblings)) {
      req.body.siblings = [];
    }
    if (!Array.isArray(req.body.expenses)) {
      req.body.expenses = [];
    }

    // Always use 'user' (not 'userId') and ensure it's set
    const data = {
      ...req.body,
      user: userId, // <-- this must match your schema!
      formCycle: formStatus.cycleId,
      status: "pending",
      resubmissionCount: latestApp ? latestApp.resubmissionCount + 1 : 0,
    };

    if (!data.user) {
      return res.status(400).json({ error: "User not found in request." });
    }

    // Debug: Log all files received
    console.log('Files received:', req.files);
    
    // Save file paths if files are uploaded
    if (req.files?.frontImage?.[0]) {
      data.frontImage = req.files.frontImage[0].path;
      console.log('Front image saved:', data.frontImage);
    }
    if (req.files?.backImage?.[0]) {
      data.backImage = req.files.backImage[0].path;
      console.log('Back image saved:', data.backImage);
    }
    if (req.files?.coeImage?.[0]) {
      data.coeImage = req.files.coeImage[0].path;
      console.log('COE image saved:', data.coeImage);
    }
    if (req.files?.voter?.[0]) {
      data.voter = req.files.voter[0].path;
      console.log('Voter certificate saved:', data.voter);
    }

    // Ensure academicLevel is present — try to infer from `year` when missing
    if (!data.academicLevel) {
      const yearVal = (data.year || "").toString().toLowerCase();
      if (yearVal.includes("grade")) {
        data.academicLevel = "Senior High School";
      } else if (/1st|2nd|3rd|4th|5th|6th/.test(yearVal) || yearVal.includes("year")) {
        data.academicLevel = "College";
      }
    }

    // If still missing, return a helpful 400 error instead of letting Mongoose throw a ValidationError
    if (!data.academicLevel) {
      return res.status(400).json({ error: 'academicLevel is required. Please include `academicLevel` or select a Year so it can be inferred.' });
    }

    const presentCycle = await getPresentCycle("Educational Assistance");
    const newApp = new EducationalAssistance({
      ...data,
      formCycle: presentCycle._id,
    });
    await newApp.save();

    // Create notification with cycleId and read: false
    const notif = new Notification({
      type: "educational-assistance",
      event: "newSubmission",
      message: `New Educational Assistance submission from user ${userId}`,
      referenceId: newApp._id,
      cycleId: presentCycle._id,
      createdAt: new Date(),
      read: false,
    });
    await notif.save();

    // Real-time notification (Socket.IO)
    if (req.app.get("io")) {
      req.app.get("io").emit("educational-assistance:newSubmission", {
        id: newApp._id,
        user: userId,
        createdAt: newApp.createdAt,
        status: newApp.status,
        message: notif.message,
      });
    }

    res.status(201).json({ message: "Application submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while submitting form" });
  }
};

// Check if the user's latest application in the present cycle was rejected
exports.checkIfRejected = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Determine present cycle (reuses helper above)
    const presentCycle = await getPresentCycle("Educational Assistance");

    // Find the most recent application for this user in the present cycle
    const application = await EducationalAssistance.findOne({
      user: userId,
      formCycle: presentCycle._id,
    }).sort({ createdAt: -1 });

    if (!application) {
      return res.json({ rejected: false });
    }

    if (application.status === 'rejected') {
      return res.json({
        rejected: true,
        applicationId: application._id,
        rejectionReason: application.rejectionReason || null,
      });
    }

    return res.json({ rejected: false });
  } catch (err) {
    console.error('checkIfRejected error:', err);
    return res.status(500).json({ error: 'Server error while checking application status' });
  }
};

// Get my application
exports.getMyApplication = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current form cycle
    const formStatus = await FormStatus.findOne({
      formName: "Educational Assistance",
    });

    // Find application for current user in current cycle
    // Return the most recent application for the user in the current cycle
    const application = await EducationalAssistance.findOne({
      user: userId,
      formCycle: formStatus?.cycleId,
    }).sort({ createdAt: -1 }).populate("user", "username email birthday");

    if (!application) {
      return res
        .status(404)
        .json({ error: "No application found for this cycle" });
    }

    res.status(200).json(application);
  } catch (err) {
    console.error("Get my application error:", err);
    res.status(500).json({ error: "Failed to fetch application" });
  }
};

// User: update my application (accepts multipart fields frontImage/backImage/coeImage/voter)
exports.updateMyApplication = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const formStatus = await FormStatus.findOne({ formName: 'Educational Assistance' });
    if (!formStatus || !formStatus.cycleId) return res.status(404).json({ error: 'Form cycle not found' });

    // NEW: prevent editing when the form is closed
    if (!formStatus.isOpen) {
      return res.status(403).json({ error: 'Form is currently closed. Editing submissions is not allowed.' });
    }

    // Ensure we operate on the most recent application in the cycle
    const application = await EducationalAssistance.findOne({ user: userId, formCycle: formStatus.cycleId }).sort({ createdAt: -1 });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Update simple fields if provided in body
    const updatable = [
      'surname','firstname','middlename','suffix','birthday','placeOfBirth','age','gender','civilstatus','religion','email','contact','schoolname','schooladdress','academicLevel','year','benefittype','fathername','fathercontact','mothername','mothercontact'
    ];
    updatable.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(req.body, k) && req.body[k] !== undefined) {
        application[k] = req.body[k];
      }
    });

    // Parse siblings/expenses if provided as JSON strings
    if (req.body.siblings) {
      try { application.siblings = typeof req.body.siblings === 'string' ? JSON.parse(req.body.siblings) : req.body.siblings; } catch (e) { /* ignore parse errors */ }
    }
    if (req.body.expenses) {
      try { application.expenses = typeof req.body.expenses === 'string' ? JSON.parse(req.body.expenses) : req.body.expenses; } catch (e) { /* ignore parse errors */ }
    }

    // Helper to extract Cloudinary public_id from stored url
    function extractPublicId(url) {
      try {
        if (!url || typeof url !== 'string') return null;
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        let after = parts[1];
        after = after.replace(/^v\d+\//, '');
        after = after.replace(/\.[a-zA-Z0-9]+$/, '');
        return after;
      } catch (e) {
        return null;
      }
    }

    // Handle removal flags (may be JSON string)
    if (req.body && req.body._removed) {
      let removed = req.body._removed;
      if (typeof removed === 'string') {
        try { removed = JSON.parse(removed); } catch (e) { /* keep as-is */ }
      }
      if (removed && (removed.front || removed.frontImage)) {
        if (application.frontImage) {
          const pid = extractPublicId(application.frontImage);
          if (pid) {
            try { await cloudinary.uploader.destroy(pid); } catch (e) { console.warn('Cloudinary destroy front failed', e); }
          }
        }
        application.frontImage = null;
      }
      if (removed && (removed.back || removed.backImage)) {
        if (application.backImage) {
          const pid = extractPublicId(application.backImage);
          if (pid) {
            try { await cloudinary.uploader.destroy(pid); } catch (e) { console.warn('Cloudinary destroy back failed', e); }
          }
        }
        application.backImage = null;
      }
      if (removed && (removed.coe || removed.coeImage)) {
        if (application.coeImage) {
          const pid = extractPublicId(application.coeImage);
          if (pid) {
            try { await cloudinary.uploader.destroy(pid); } catch (e) { console.warn('Cloudinary destroy coe failed', e); }
          }
        }
        application.coeImage = null;
      }
      if (removed && (removed.voter || removed.voterImage)) {
        if (application.voter) {
          const pid = extractPublicId(application.voter);
          if (pid) {
            try { await cloudinary.uploader.destroy(pid); } catch (e) { console.warn('Cloudinary destroy voter failed', e); }
          }
        }
        application.voter = null;
      }
    }

    // Replace with newly uploaded files (delete old first)
    if (req.files && req.files.frontImage && req.files.frontImage[0]) {
      if (application.frontImage) {
        const oldPid = extractPublicId(application.frontImage);
        if (oldPid) {
          try { await cloudinary.uploader.destroy(oldPid); } catch (e) { console.warn('Cloudinary destroy old front failed', e); }
        }
      }
      application.frontImage = req.files.frontImage[0].path;
    }
    if (req.files && req.files.backImage && req.files.backImage[0]) {
      if (application.backImage) {
        const oldPid = extractPublicId(application.backImage);
        if (oldPid) {
          try { await cloudinary.uploader.destroy(oldPid); } catch (e) { console.warn('Cloudinary destroy old back failed', e); }
        }
      }
      application.backImage = req.files.backImage[0].path;
    }
    if (req.files && req.files.coeImage && req.files.coeImage[0]) {
      if (application.coeImage) {
        const oldPid = extractPublicId(application.coeImage);
        if (oldPid) {
          try { await cloudinary.uploader.destroy(oldPid); } catch (e) { console.warn('Cloudinary destroy old coe failed', e); }
        }
      }
      application.coeImage = req.files.coeImage[0].path;
    }
    if (req.files && req.files.voter && req.files.voter[0]) {
      if (application.voter) {
        const oldPid = extractPublicId(application.voter);
        if (oldPid) {
          try { await cloudinary.uploader.destroy(oldPid); } catch (e) { console.warn('Cloudinary destroy old voter failed', e); }
        }
      }
      application.voter = req.files.voter[0].path;
    }

    // Ensure academicLevel exists before saving updated application; try to infer from year if missing
    if (!application.academicLevel) {
      const yearVal = (application.year || req.body.year || "").toString().toLowerCase();
      if (yearVal.includes("grade")) {
        application.academicLevel = "Senior High School";
      } else if (/1st|2nd|3rd|4th|5th|6th/.test(yearVal) || yearVal.includes("year")) {
        application.academicLevel = "College";
      }
    }

    if (!application.academicLevel) {
      return res.status(400).json({ error: 'academicLevel is required for the application. Provide `academicLevel` or a Year so it can be inferred.' });
    }

    // Mark as unread when user edits
    application.isRead = false;
    await application.save();

    // Emit socket event to notify admin dashboard
    if (req.app.get("io")) {
      req.app.get("io").emit("educational-assistance:updated", {
        id: application._id,
        user: userId,
        updatedAt: new Date(),
      });
    }

    return res.json({ message: 'Application updated', application });
  } catch (err) {
    console.error('updateMyApplication error:', err);
    return res.status(500).json({ error: 'Server error while updating application' });
  }
};

// Admin - get all applications
exports.getAllApplications = async (req, res) => {
  try {
    const { year, cycle, all, classification } = req.query;
    let cycleDoc = null;
    let filter = {};

    // 1. If all=true, return all cycles (optionally filter by classification)
    if (all === "true") {
      if (classification) filter.youthClassification = classification;

      // Aggregate: group by user, get latest application
      const applications = await EducationalAssistance.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$user",
            latestApplication: { $first: "$$ROOT" },
          },
        },
      ]);

      // Populate user and formCycle for each result
      const populated = await Promise.all(
        applications.map(async (app) => {
          const populatedUser = await EducationalAssistance.populate(
            app.latestApplication,
            [{ path: "user", select: "username email" }, { path: "formCycle" }]
          );
          return populatedUser;
        })
      );

      return res.json(populated);
    }

    // 2. If year & cycle specified, use that cycle
    if (year && cycle) {
      cycleDoc = await FormCycle.findOne({
        formName: "Educational Assistance",
        year: Number(year),
        cycleNumber: Number(cycle),
      });
      if (!cycleDoc) {
        return res.status(404).json({ error: "Specified cycle not found" });
      }
    } else {
      // 3. Otherwise, use present (open) cycle
      try {
        cycleDoc = await getPresentCycle("Educational Assistance");
      } catch (err) {
        return res.status(404).json({ error: err.message });
      }
    }

    filter.formCycle = cycleDoc._id;
    if (classification) filter.youthClassification = classification;

    // Aggregate: group by user, get latest application for this cycle
    const applications = await EducationalAssistance.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          latestApplication: { $first: "$$ROOT" },
        },
      },
    ]);

    // Populate user and formCycle for each result
    const populated = await Promise.all(
      applications.map(async (app) => {
        const populatedUser = await EducationalAssistance.populate(
          app.latestApplication,
          [{ path: "user", select: "username email" }, { path: "formCycle" }]
        );
        return populatedUser;
      })
    );

    res.json(populated);
  } catch (err) {
    console.error("getAllApplications error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Admin - get by ID
exports.getApplicationById = async (req, res) => {
  const app = await EducationalAssistance.findById(req.params.id).populate(
    "user",
    "username email birthday"
  );
  if (!app) return res.status(404).json({ error: "Application not found" });

  // Mark as read ONLY for admin users
  if (req.user && req.user.role === "admin" && !app.isRead) {
    app.isRead = true;
    await app.save();
  }

  // Mark related notifications as read
  await Notification.updateMany(
    { referenceId: app._id, type: "educational-assistance", read: false },
    { $set: { read: true } }
  );

  res.json(app);
};

// Admin - filter by fields (e.g. surname, school)
exports.filterApplications = async (req, res) => {
  try {
    const {
      year,
      cycle,
      all,
      yearLevel,
      school,
      course,
      purok,
      classification,
    } = req.query;
    let cycleDoc = null;
    let filter = {};

    // If all=true, return all cycles (optionally filter by other fields)
    if (all === "true") {
      if (yearLevel) filter.yearLevel = yearLevel;
      if (school) filter.school = school;
      if (course) filter.course = course;
      if (purok) filter.purok = purok;
      if (classification) filter.classification = classification;
      const applications = await EducationalAssistance.find(filter)
        .populate("formCycle")
        .populate("user", "username email");
      return res.json(applications);
    }

    // If year & cycle specified, use that cycle
    if (year && cycle) {
      cycleDoc = await FormCycle.findOne({
        formName: "Educational Assistance",
        year: Number(year),
        cycleNumber: Number(cycle),
      });
      if (!cycleDoc) {
        return res.status(404).json({ error: "Specified cycle not found" });
      }
    } else {
      // Otherwise, use present (open) cycle
      try {
        cycleDoc = await getPresentCycle("Educational Assistance");
      } catch (err) {
        return res.status(404).json({ error: err.message });
      }
    }

    filter.formCycle = cycleDoc._id;
    if (yearLevel) filter.yearLevel = yearLevel;
    if (school) filter.school = school;
    if (course) filter.course = course;
    if (purok) filter.purok = purok;
    if (classification) filter.classification = classification;

    const applications = await EducationalAssistance.find(filter)
      .populate("formCycle")
      .populate("user", "username email");

    res.json(applications);
  } catch (err) {
    console.error("filterApplications error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Admin - delete application
exports.deleteApplication = async (req, res) => {
  try {
    const deleted = await EducationalAssistance.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    // Delete all notifications related to this application
    await Notification.deleteMany({
      referenceId: deleted._id,
      type: "educational-assistance"
    });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin - filter applications by cycle
exports.filterApplicationsByCycle = async (req, res) => {
  try {
    const { cycleNumber, year } = req.query;

    // Validate inputs
    if (!cycleNumber || !year) {
      return res.status(400).json({
        error: "cycleNumber and year are required",
      });
    }

    // Find the cycle for Educational Assistance
    const cycle = await FormCycle.findOne({
      formName: "Educational Assistance",
      cycleNumber: Number(cycleNumber),
      year: Number(year),
    });

    if (!cycle) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    // Find all applications for that cycle
    const applications = await EducationalAssistance.find({
      formCycle: cycle._id,
    }).populate("user", "username email");

    res.json(applications);
  } catch (error) {
    console.error("Filter error:", error);
    res.status(500).json({ error: "Failed to filter applications" });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const app = await EducationalAssistance.findById(req.params.id).populate(
      "user",
      "email username"
    );
    if (!app) return res.status(404).json({ error: "Application not found" });

    app.status = status;
    app.rejectionReason =
      status === "rejected" ? rejectionReason || "No reason provided" : null;

    await app.save();

    // Only send email if recipient exists
    if (status === "rejected" && app.user && app.user.email) {
      try {
        await sendRejectionEmail({
          to: app.user.email,
          username: app.user.username,
          rejectionReason: app.rejectionReason,
        });
      } catch (emailErr) {
        console.error("Failed to send rejection email:", emailErr);
      }
    }

    // --- EMIT SOCKET EVENT FOR REAL-TIME BADGE UPDATE ---
    if (req.app.get("io")) {
      req.app.get("io").emit("educational-assistance:statusChanged", {
        id: app._id,
        status: app.status,
      });
    }

    // Remove or mark notifications for this application when status is no longer pending
    try {
      if (app.status !== 'pending') {
        // Delete any pending notifications related to this application so they don't remain in admin queues
        await require('../models/Notification').deleteMany({ referenceId: app._id, type: 'educational-assistance' });
      }
    } catch (notifErr) {
      console.error('Failed to update/delete notifications for application status change:', notifErr);
    }

    // --- CREATE ANNOUNCEMENT FOR THE USER ---
    if (["approved", "rejected"].includes(status) && app.user && app.user._id) {
      let title, content;
      if (status === "approved") {
        title = "Educational Assistance Application Approved";
        content = "Congratulations! Your Educational Assistance application has been approved.";
      } else if (status === "rejected") {
        title = "Educational Assistance Application Rejected";
        content = `We regret to inform you that your Educational Assistance application has been rejected. Reason:\n${app.rejectionReason || "No reason provided."}`;
      }
      try {
        // Set expiresAt to 3 days from now (like KK/LGBTQ), or null if you want permanent
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        const announcement = await Announcement.create({
          title,
          content,
          category: "Educational Assistance",
          eventDate: new Date(),
          expiresAt, // <-- set expiry like KK/LGBTQ
          createdBy: req.user.id,
          recipient: app.user._id,
          isPinned: false,
          isActive: true,
          viewedBy: [],
        });

        // --- EMIT SOCKET EVENT FOR REAL-TIME ANNOUNCEMENT DISPLAY ---
        if (req.app.get("io")) {
          req.app.get("io").emit("announcement:created", {
            id: announcement._id,
            title: announcement.title,
            content: announcement.content,
            eventDate: announcement.eventDate,
            createdAt: announcement.createdAt,
            createdBy: req.user.id,
            recipient: announcement.recipient,
            isPinned: announcement.isPinned,
            isActive: announcement.isActive,
            category: announcement.category
          });
        }
      } catch (annErr) {
        console.error("Failed to create announcement:", annErr);
        // Don't throw, just log
      }
    }

    res.json({ message: "Status updated successfully", application: app });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating status" });
  }
};
// Admin - Get applications by status (pending, rejected, accepted)
exports.getApplicationsByStatus = async (req, res) => {
  try {
    const { status, cycleId, cycleNumber, year } = req.query;

    // Validate status
    const allowedStatuses = ["pending", "rejected", "approved", "accepted"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error:
          "Invalid status. Must be pending, approved, accepted, or rejected",
      });
    }

    // Build query object
    const query = {};
    if (status) query.status = status;

    // Support filtering by cycleId OR by cycleNumber+year
    if (cycleId) {
      query.formCycle = cycleId;
    } else if (cycleNumber && year) {
      const cycle = await FormCycle.findOne({
        formName: "Educational Assistance",
        cycleNumber: Number(cycleNumber),
        year: Number(year),
      });
      if (!cycle) {
        return res.status(404).json({ error: "Cycle not found" });
      }
      query.formCycle = cycle._id;
    }

    const applications = await EducationalAssistance.find(query)
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error("Get by status/cycle error:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
};

// Admin - Get cycles and present cycle
exports.getCyclesAndPresent = async (req, res) => {
  console.log("cycles-and-present route HIT");
  try {
    console.log("Fetching all cycles...");
    const allCycles = await FormCycle.find({
      formName: "Educational Assistance",
    }).sort({ year: -1, cycleNumber: -1 });
    console.log("All cycles found:", allCycles.length);

    let presentCycle = null;
    try {
      presentCycle = await getPresentCycle("Educational Assistance");
      console.log(
        "Present cycle found:",
        presentCycle ? presentCycle._id : null
      );
    } catch (err) {
      console.log("No present cycle:", err.message);
      presentCycle = null;
    }

    res.json({ allCycles, presentCycle });
  } catch (err) {
    console.error("getCyclesAndPresent error:", err);
    res
      .status(500)
      .json({ error: "Failed to load cycles", details: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  const notifs = await Notification.find({ type: "educational-assistance" })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(notifs);
};


exports.exportApplicationsToExcel = async (req, res) => {
  try {
    const { year, cycle } = req.query;

    // Load the template
    const templatePath = path.resolve(__dirname, '../templates/educational_assistance_template.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Excel template file not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0]; // Use the first worksheet

    // Find the cycle
    const cycleDoc = await FormCycle.findOne({
      formName: "Educational Assistance",
      year: Number(year),
      cycleNumber: Number(cycle),
    });

    if (!cycleDoc) {
      return res.status(404).json({ error: "Specified cycle not found" });
    }

    // Get applications
    let applications = await EducationalAssistance.find({
      formCycle: cycleDoc._id,
      status: "approved" // Only export approved applications
    })
    // populate user including contact fields (try both possible field names)
    .populate("user", "username email birthday sex address contactNumber contactNo");

    if (!applications.length) {
      return res.status(404).json({ error: "No profiling found for this cycle" });
    }

    // Sort applications by name (optional)
    applications = applications.sort((a, b) => {
      const nameA = `${a.surname || ""} ${a.firstname || ""}`.toUpperCase();
      const nameB = `${b.surname || ""} ${b.firstname || ""}`.toUpperCase();
      return nameA.localeCompare(nameB);
    });

    // Start writing data at row 4 (adjust if your template is different)
    let rowNum = 4;
    applications.forEach(app => {
      // Full name
      const fullName = `${(app.surname || '').toUpperCase()}, ${(app.firstname || '').toUpperCase()} ${(app.middlename || '').toUpperCase()}`.trim();

      // Age calculation from birthday
      let age = "N/A";
      if (app.birthday) {
        const birthDate = new Date(app.birthday);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear() - (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
      }

      // Gender
      const gender = app.sex || "N/A";

      // Email (prefer application then user)
      const email = app.email || app.user?.email || "N/A";

      // Contact No.  (prefer application.contactNumber/contactNo then user.contactNumber/contactNo)
      const contactNo = (app.contactNumber || app.contactNo) || (app.user && (app.user.contactNumber || app.user.contactNo)) || "N/A";

      // School
      const school = app.school || "N/A";

      // Write to template columns (adjust column letters as needed)
      worksheet.getCell(`A${rowNum}`).value = fullName;    // Name
      worksheet.getCell(`B${rowNum}`).value = age;         // Age
      worksheet.getCell(`C${rowNum}`).value = gender;      // Gender
      worksheet.getCell(`D${rowNum}`).value = email;       // Email Address
      worksheet.getCell(`E${rowNum}`).value = contactNo;   // Contact No.
      worksheet.getCell(`F${rowNum}`).value = school;      // School

      rowNum++;
    });

    // Set headers for the response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=educational_assistance_export_${year || 'present'}_cycle_${cycle || 'open'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Failed to export applications" });
  }
};

exports.resubmitApplication = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const appId = req.params.id;
    const application = await EducationalAssistance.findById(appId).populate("user", "email username");
    if (!application) return res.status(404).json({ error: "Application not found" });
    if (application.user && String(application.user._id) !== String(userId)) {
      return res.status(403).json({ error: "You may only resubmit your own application" });
    }
    if (application.status !== "rejected") {
      return res.status(400).json({ error: "Only rejected applications can be resubmitted" });
    }

    // Parse arrays if strings
    if (typeof req.body.siblings === "string") {
      try { req.body.siblings = JSON.parse(req.body.siblings); } catch (e) { /* ignore */ }
    }
    if (typeof req.body.expenses === "string") {
      try { req.body.expenses = JSON.parse(req.body.expenses); } catch (e) { /* ignore */ }
    }

    // Fields to compare / update
    const updatableFields = [
      "surname","firstname","middlename","placeOfBirth","age","sex",
      "civilStatus","religion","email","contactNumber","school","schoolAddress",
      "academicLevel","year","fatherName","fatherPhone","motherName","motherPhone"
    ];

    // Helper: simple deep-equal-ish for arrays/objects
    const isSame = (a, b) => {
      try {
        return JSON.stringify(a || null) === JSON.stringify(b || null);
      } catch (e) { return false; }
    };

    // detect changes
    let changed = false;
    for (const k of updatableFields) {
      const incoming = req.body[k];
      const existing = application[k];
      if (incoming !== undefined) {
        // normalize numbers/strings
        const inc = (typeof existing === "number") ? Number(incoming) : incoming;
        if (!isSame(inc, existing)) {
          changed = true;
          application[k] = inc;
        }
      }
    }

    // siblings / expenses arrays
    if (req.body.siblings !== undefined) {
      if (!isSame(req.body.siblings, application.siblings)) {
        changed = true;
        application.siblings = Array.isArray(req.body.siblings) ? req.body.siblings : [];
      }
    }
    if (req.body.expenses !== undefined) {
      if (!isSame(req.body.expenses, application.expenses)) {
        changed = true;
        application.expenses = Array.isArray(req.body.expenses) ? req.body.expenses : [];
      }
    }

    // Handle file removals indicated by _removed flag (same format as updateMyApplication)
    let removed = req.body._removed;
    if (removed && typeof removed === "string") {
      try { removed = JSON.parse(removed); } catch (e) { /* ignore */ }
    }
    function extractPublicId(url) {
      try {
        if (!url || typeof url !== "string") return null;
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        let after = parts[1];
        after = after.replace(/^v\d+\//, '');
        after = after.replace(/\.[a-zA-Z0-9]+$/, '');
        return after;
      } catch (e) { return null; }
    }
    // track if files changed
    if (removed && (removed.front || removed.frontImage)) {
      if (application.frontImage) {
        const pid = extractPublicId(application.frontImage);
        if (pid) {
          try { await cloudinary.uploader.destroy(pid); } catch (e) { /* ignore */ }
        }
      }
      application.frontImage = null;
      changed = true;
    }
    if (removed && (removed.back || removed.backImage)) {
      if (application.backImage) {
        const pid = extractPublicId(application.backImage);
        if (pid) {
          try { await cloudinary.uploader.destroy(pid); } catch (e) { /* ignore */ }
        }
      }
      application.backImage = null;
      changed = true;
    }
    if (removed && (removed.coe || removed.coeImage)) {
      if (application.coeImage) {
        const pid = extractPublicId(application.coeImage);
        if (pid) {
          try { await cloudinary.uploader.destroy(pid); } catch (e) { /* ignore */ }
        }
      }
      application.coeImage = null;
      changed = true;
    }
    if (removed && (removed.voter || removed.voterImage)) {
      if (application.voter) {
        const pid = extractPublicId(application.voter);
        if (pid) {
          try { await cloudinary.uploader.destroy(pid); } catch (e) { /* ignore */ }
        }
      }
      application.voter = null;
      changed = true;
    }

    // Handle newly uploaded files (replace old => delete old cloudinary if present)
    if (req.files?.frontImage?.[0]) {
      if (application.frontImage) {
        const oldPid = extractPublicId(application.frontImage);
        if (oldPid) { try { await cloudinary.uploader.destroy(oldPid); } catch (e) {} }
      }
      application.frontImage = req.files.frontImage[0].path;
      changed = true;
    }
    if (req.files?.backImage?.[0]) {
      if (application.backImage) {
        const oldPid = extractPublicId(application.backImage);
        if (oldPid) { try { await cloudinary.uploader.destroy(oldPid); } catch (e) {} }
      }
      application.backImage = req.files.backImage[0].path;
      changed = true;
    }
    if (req.files?.coeImage?.[0]) {
      if (application.coeImage) {
        const oldPid = extractPublicId(application.coeImage);
        if (oldPid) { try { await cloudinary.uploader.destroy(oldPid); } catch (e) {} }
      }
      application.coeImage = req.files.coeImage[0].path;
      changed = true;
    }
    if (req.files?.voter?.[0]) {
      if (application.voter) {
        const oldPid = extractPublicId(application.voter);
        if (oldPid) { try { await cloudinary.uploader.destroy(oldPid); } catch (e) {} }
      }
      application.voter = req.files.voter[0].path;
      changed = true;
    }

    if (!changed) {
      return res.status(400).json({ error: "No changes detected. Please modify something to resubmit." });
    }

    // Apply resubmission metadata
    application.status = "pending";
    application.rejectionReason = null;
    application.resubmissionCount = (application.resubmissionCount || 0) + 1;
    application.createdAt = new Date(); // treat as new submission time
    // Mark as unread for admins so it appears in admin queue/notifications again
    application.isRead = false;
    
    await application.save();

    // Update existing notifications for this application instead of creating duplicates.
    try {
      const updateResult = await Notification.updateMany(
        { referenceId: application._id, type: 'educational-assistance' },
        {
          $set: {
            event: 'resubmission',
            message: `User ${userId} resubmitted Educational Assistance application`,
            cycleId: application.formCycle,
            createdAt: new Date(),
            read: false,
          },
        }
      );

      // If no existing notifications were updated, create a fresh one
      if (!updateResult.matchedCount && !updateResult.modifiedCount) {
        const notif = new Notification({
          type: "educational-assistance",
          event: "resubmission",
          message: `User ${userId} resubmitted Educational Assistance application`,
          referenceId: application._id,
          cycleId: application.formCycle,
          createdAt: new Date(),
          read: false,
        });
        await notif.save();
      }
    } catch (notifErr) {
      console.error('Failed to update/create resubmission notification:', notifErr);
    }

    if (req.app.get("io")) {
      req.app.get("io").emit("educational-assistance:resubmitted", {
        id: application._id,
        user: userId,
        createdAt: application.createdAt,
        status: application.status,
      });
    }

    return res.json({ message: "Application resubmitted successfully", application });
  } catch (err) {
    console.error("resubmitApplication error:", err);
    return res.status(500).json({ error: "Server error while resubmitting application" });
  }
};
