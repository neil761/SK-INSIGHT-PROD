const EducationalAssistance = require("../models/EducationalAssistance");
const FormCycle = require("../models/FormCycle");
const sendRejectionEmail = require("../utils/sendRejectionEmail");
const Notification = require("../models/Notification");
const FormStatus = require("../models/FormStatus");
const ExcelJS = require('exceljs'); // Make sure to install: npm install exceljs
const path = require("path");
const fs = require("fs");
    const Announcement = require("../models/Announcement");
async function getPresentCycle(formName) {
  const status = await FormStatus.findOne({ formName, isOpen: true }).populate(
    "cycleId"
  );
  if (!status || !status.cycleId) throw new Error("No active form cycle");
  return status.cycleId;
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

// Get my application
exports.getMyApplication = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current form cycle
    const formStatus = await FormStatus.findOne({
      formName: "Educational Assistance",
    });

    // Find application for current user in current cycle
    const application = await EducationalAssistance.findOne({
      user: userId,
      formCycle: formStatus?.cycleId,
    }).populate("user", "username email");

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
        await Announcement.create({
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
    }).populate("user", "username email birthday sex address");

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

      // Email
      const email = app.user?.email || "N/A";

      // Contact No.  
      const contactNo = app.contactNo || app.user?.contactNo || "N/A";

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
