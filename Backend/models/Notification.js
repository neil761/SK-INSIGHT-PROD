const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: String,
  event: String,
  message: String,
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EducationalAssistance",
  },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: "FormCycle" }, // <-- add this
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

module.exports = mongoose.model("Notification", notificationSchema);
