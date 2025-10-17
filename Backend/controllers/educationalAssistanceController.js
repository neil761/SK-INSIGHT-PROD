const EducationalAssistance = require("../models/EducationalAssistance");
const FormCycle = require("../models/FormCycle");
const sendRejectionEmail = require("../utils/sendRejectionEmail");
const Notification = require("../models/Notification");
const FormStatus = require("../models/FormStatus");
const ExcelJS = require('exceljs'); // Make sure to install: npm install exceljs
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

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
    if (typeof req.body.siblings === "string") {
      req.body.siblings = JSON.parse(req.body.siblings);
    }
    if (typeof req.body.expenses === "string") {
      req.body.expenses = JSON.parse(req.body.expenses);
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

    // Save file paths if files are uploaded
    if (req.files?.frontImage?.[0]) {
      data.frontImage = req.files.frontImage[0].path;
    }
    if (req.files?.backImage?.[0]) {
      data.backImage = req.files.backImage[0].path;
    }
    if (req.files?.coeImage?.[0]) {
      data.coeImage = req.files.coeImage[0].path;
    }
    if (req.files?.voter?.[0]) {
      data.voter = req.files.voter[0].path;
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
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid application ID" });
  }

  try {
    const app = await EducationalAssistance.findById(id).populate(
      "user",
      "username email"
    );
    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }

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
  } catch (err) {
    console.error("Error fetching application by ID:", err);
    res.status(500).json({ error: "Server error" });
  }
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
    const deleted = await EducationalAssistance.findByIdAndDelete(
      req.params.id
    );
    if (!deleted) return res.status(404).json({ message: "Not found" });
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
      console.log("Sending rejection email to:", app.user.email);
      await sendRejectionEmail({
        to: app.user.email,
        username: app.user.username,
        rejectionReason: app.rejectionReason,
      });
    } else if (status === "rejected") {
      console.log(
        "No valid recipient email found for rejection email. User:",
        app.user
      );
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
    const templatePath = path.resolve(__dirname, '../templates/educational_assistance_template.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Excel template file not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.worksheets[0]; // Use the first worksheet

    // Check if year and cycle are provided in the query
    const { year, cycle } = req.query;

    let formCycle;
    if (year && cycle) {
      // Fetch the specific cycle based on year, cycle number, and formName
      formCycle = await FormCycle.findOne({
        formName: "Educational Assistance",
        year: Number(year),
        cycleNumber: Number(cycle),
      });

      if (!formCycle) {
        return res.status(404).json({ error: `No cycle found for year ${year} and cycle ${cycle}` });
      }
    } else {
      // Fetch the present (open) cycle
      formCycle = await FormCycle.findOne({ formName: "Educational Assistance", isOpen: true });
      if (!formCycle) {
        return res.status(404).json({ error: 'No open cycle found' });
      }
    }

    // Fetch only approved Educational Assistance applications for the selected cycle
    const applications = await EducationalAssistance.find({
      formCycle: formCycle._id,
      status: "approved", // Only include approved applications
    }).populate("user", "birthday email"); // Populate only necessary fields from the user reference

    if (!applications.length) {
      return res.status(404).json({ error: 'No approved applications found for the selected cycle' });
    }

    // Start writing data at row 4 (since rows 1-3 are headers)
    let rowNum = 4;

    applications.forEach(application => {
      const fullName = `${(application.surname || '').toUpperCase()}, ${(application.firstname || '').toUpperCase()} ${(application.middlename || '').toUpperCase()}`.trim();

      // Extract birthday details and compute age
      const birthday = application.user?.birthday ? new Date(application.user.birthday) : null;
      const today = new Date();
      const age = birthday
        ? today.getFullYear() - birthday.getFullYear() - (today.getMonth() + 1 < birthday.getMonth() + 1 || (today.getMonth() + 1 === birthday.getMonth() + 1 && today.getDate() < birthday.getDate()) ? 1 : 0)
        : "N/A";

      // Gender
      const gender = application.sex || "N/A";

      // Email and Contact Number
      const email = application.user?.email || "N/A";
      const contactNumber = application.contactNumber || "N/A"; // Fetch directly from the EducationalAssistance model

      // Name of School
      const school = application.school || "N/A";

      // Write data to the existing row
      worksheet.getCell(`A${rowNum}`).value = fullName;       // Name
      worksheet.getCell(`B${rowNum}`).value = age;            // Age
      worksheet.getCell(`C${rowNum}`).value = gender;         // Gender
      worksheet.getCell(`D${rowNum}`).value = email;          // Email
      worksheet.getCell(`E${rowNum}`).value = contactNumber;  // Contact Number
      worksheet.getCell(`F${rowNum}`).value = school;         // Name of School

      rowNum++; // Move to the next row
    });

    // Set headers for the response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=educational_assistance_export_${year || 'present'}_cycle_${cycle || 'open'}.xlsx`);

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export Educational Assistance data' });
  }
};
