const mongoose = require("mongoose");

const formStatusSchema = new mongoose.Schema({
  formName: { type: String, required: true, unique: true },
  isOpen: { type: Boolean, default: true },
  cycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FormCycle",
  },
});

module.exports = mongoose.model("FormStatus", formStatusSchema);
