const EducationalAssistance = require("../models/EducationalAssistance");
const FormStatus = require("../models/FormStatus"); // Assuming the path to FormStatus model
const FormCycle = require("../models/FormCycle"); // Assuming the path to FormCycle model

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

    // Check for existing submission in current cycle
    const existing = await EducationalAssistance.findOne({
      user: userId,
      formCycle: formStatus.cycleId,
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "You already submitted an application for this cycle" });
    }

    // Parse arrays if they're strings
    if (typeof req.body.siblings === "string") {
      req.body.siblings = JSON.parse(req.body.siblings);
    }
    if (typeof req.body.expenses === "string") {
      req.body.expenses = JSON.parse(req.body.expenses);
    }

    const data = {
      ...req.body,
      user: userId,
      formCycle: formStatus.cycleId,
    };

    if (req.file) {
      data.signature = req.file.path;
    }

    const newApp = new EducationalAssistance(data);
    await newApp.save();

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
    const apps = await EducationalAssistance.find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin - get by ID
exports.getApplicationById = async (req, res) => {
  try {
    const app = await EducationalAssistance.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Not found" });
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin - filter by fields (e.g. surname, school)
exports.filterApplications = async (req, res) => {
  try {
    const query = {};

    // Dynamic filters
    if (req.query.surname) query.surname = new RegExp(req.query.surname, "i");
    if (req.query.school) query.school = new RegExp(req.query.school, "i");
    if (req.query.course) query.course = new RegExp(req.query.course, "i");
    if (req.query.yearLevel) query.yearLevel = req.query.yearLevel;

    const results = await EducationalAssistance.find(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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
