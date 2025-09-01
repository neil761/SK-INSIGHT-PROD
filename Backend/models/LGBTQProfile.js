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
    kkProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KKProfile",
      required: false,
    },
    // Fallback demographic fields
    firstname: String,
    lastname: String,
    middlename: String,
    birthday: Date,
    age: Number,
    purok: String, // <-- Add this line
    // LGBTQ-specific fields
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
