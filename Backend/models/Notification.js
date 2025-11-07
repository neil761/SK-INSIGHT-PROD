const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["educational-assistance", "kk-profile", "lgbtq-profile"], required: true },
  event: String,
  message: String,
  referenceId: { type: mongoose.Schema.Types.ObjectId, refPath: "type" }, // dynamic reference
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: "FormCycle" },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  category: { type: String, default: "application" },
  priority: { type: String, enum: ["normal", "high"], default: "normal" },
});

module.exports = mongoose.model("Notification", notificationSchema);
