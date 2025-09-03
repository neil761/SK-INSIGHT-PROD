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
    // Demographic fields
    lastname: String,
    firstname: String,
    middlename: String,
    birthday: Date,
    age: Number,
    // REMOVE address, region, province, municipality, barangay, purok
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
    idImage: {
      type: String, // URL or path to the uploaded ID image
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LGBTQProfile", lgbtqProfileSchema);
