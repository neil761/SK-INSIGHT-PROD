const mongoose = require("mongoose");

const formCycleSchema = new mongoose.Schema({
  formName: { type: String, required: true }, // e.g., 'kkprofiling', 'lgbtqprofiling'
  cycleNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  isOpen: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

formCycleSchema.index({ formName: 1, cycleNumber: 1 }, { unique: true });

module.exports = mongoose.model("FormCycle", formCycleSchema);
