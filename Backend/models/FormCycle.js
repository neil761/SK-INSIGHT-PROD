const mongoose = require("mongoose");

const cycleEventSchema = new mongoose.Schema({
  action: { type: String, enum: ["open", "close"], required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorName: { type: String, default: "" },
  at: { type: Date, default: Date.now }
}, { _id: false });

const formCycleSchema = new mongoose.Schema({
  formName: { type: String, enum: ["KK Profiling", "LGBTQIA+ Profiling", "Educational Assistance"], required: true },
  cycleNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  isOpen: { type: Boolean, default: true },
  history: { type: [cycleEventSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("FormCycle", formCycleSchema);
