const mongoose = require("mongoose");
const FormStatus = require("./models/FormStatus");

const FORMS = [
  { formName: "KK Profiling" },
  { formName: "LGBTQIA+ Profiling" },
  { formName: "Educational Assistance" }
];

async function seedForms() {
  try {
    for (const { formName } of FORMS) {
      let status = await FormStatus.findOne({ formName });
      if (!status) {
        await FormStatus.create({
          formName,
          isOpen: true,
          cycleId: null // or remove if not required by your schema
        });
        console.log(`Created FormStatus for: ${formName}`);
      } else {
        console.log(`FormStatus exists for: ${formName}`);
      }
    }
    console.log("Seeding complete.");
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

module.exports = seedForms;