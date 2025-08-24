const FormCycle = require("../models/FormCycle");

// Get all KK Profiling cycles
exports.getKkCycles = async (req, res) => {
  try {
    const cycles = await FormCycle.find({ formName: "KK Profiling" }).sort({
      year: 1,
      cycleNumber: 1,
    });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch KK cycles" });
  }
};

// Get all LGBTQ Profiling cycles
exports.getLgbtqCycles = async (req, res) => {
  try {
    const cycles = await FormCycle.find({
      formName: "LGBTQIA+ Profiling",
    }).sort({
      year: 1,
      cycleNumber: 1,
    });
    res.json(cycles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch LGBTQ cycles" });
  }
};

// Get all Educational Assistance cycles
exports.getEducCycles = async (req, res) => {
  try {
    const cycles = await FormCycle.find({
      formName: "Educational Assistance",
    }).sort({ year: 1, cycleNumber: 1 });
    res.json(cycles);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch Educational Assistance cycles" });
  }
};
