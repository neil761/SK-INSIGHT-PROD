const mongoose = require("mongoose");

const lgbtqProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    formCycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormCycle",
      required: true,
    },
    sexAssignedAtBirth: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    lgbtqClassification: {
      type: String,
      enum: ["Lesbian", "Gay", "Bisexual", "Queer", "Intersex", "Asexual"],
      required: true,
    },
    idImage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("LGBTQProfile", lgbtqProfileSchema);
