const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/kkProfileController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const KKProfile = require("../models/KKProfile");
const upload = require("../middleware/uploadProfileImage");

// New imports for DOCX generation
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");

// Checkbox utility
function checkbox(value, match) {
  return value === match ? "☑" : "☐";
}

// Image module setup
function getImageModuleOptions() {
  return {
    getImage: function (tagValue) {
      if (!tagValue) return Buffer.alloc(0);
      if (tagValue.path && fs.existsSync(tagValue.path)) {
        return fs.readFileSync(tagValue.path);
      }
      if (tagValue.data) {
        return Buffer.from(tagValue.data, "base64");
      }
      return Buffer.alloc(0);
    },
    getSize: function () {
      return [150, 80]; // width, height in px
    },
  };
}

// ---------------------------
// Export single profile to Word
// ---------------------------
router.get("/export/:id", protect, async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile) return res.status(404).send("Profile not found");

    // ✅ Allow: Admin exports any profile, user exports their own
    if (req.user.role !== "admin" && String(profile.user) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized to export this profile" });
    }

    const templatePath = path.resolve(
      __dirname,
      "../templates/kk_profiling_template - for merge.docx"
    );
    console.log("Template Path:", templatePath);
    if (!fs.existsSync(templatePath)) {
      return res.status(500).send("Template file not found");
    }

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      modules: [new ImageModule(getImageModuleOptions())],
      paragraphLoop: true,
      linebreaks: true,
    });

    // Utils
    function formatBirthday(birthday) {
      if (!birthday) return "";
      const date = new Date(birthday);
      const options = { year: "numeric", month: "long", day: "numeric" };
      return date.toLocaleDateString("en-US", options); // e.g., March 31, 2004
    }

    function calculateAge(birthday) {
      if (!birthday) return "";
      const today = new Date();
      const birthDate = new Date(birthday);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    // 🔑 Resolve uploaded image paths
// 🔑 Resolve uploaded image paths
const profileImagePath = profile.profileImage
  ? path.resolve(__dirname, "../uploads/profile", profile.profileImage)
  : null;

const signatureImagePath = profile.signatureImage
  ? path.resolve(__dirname, "../uploads/signatures", profile.signatureImage)
  : null;


    // Load image buffers safely

    const signatureImageBuffer =
      signatureImagePath && fs.existsSync(signatureImagePath)
        ? { data: fs.readFileSync(signatureImagePath, "base64") }
        : null;

    // Render data into template
    doc.render({
      // Personal info
      firstname: profile.firstname || "",
      lastname: profile.lastname || "",
      middlename: profile.middlename || "",
      age: calculateAge(profile.birthday),
      gender: profile.gender || "",
      birthday: formatBirthday(profile.birthday),
      address: `${profile.purok || ""}, ${profile.barangay || ""}, ${
        profile.municipality || ""
      }, ${profile.province || ""}`,
      contact: profile.contactNumber || "",
      remarks: profile.remarks || "",

      // Civil Status
      single_checkbox: checkbox(profile.civilStatus, "Single"),
      married_checkbox: checkbox(profile.civilStatus, "Married"),
      widowed_checkbox: checkbox(profile.civilStatus, "Widowed"),
      separated_checkbox: checkbox(profile.civilStatus, "Separated"),

      // Educational Background
      elem_grad_checkbox: checkbox(profile.educationalBackground, "Elementary Graduate"),
      hs_grad_checkbox: checkbox(profile.educationalBackground, "High School Graduate"),
      college_grad_checkbox: checkbox(profile.educationalBackground, "College Graduate"),
      voc_grad_checkbox: checkbox(profile.educationalBackground, "Vocational Graduate"),
      none_checkbox: checkbox(profile.educationalBackground, "None"),

      // Work Status
      employed_checkbox: checkbox(profile.workStatus, "Employed"),
      unemployed_checkbox: checkbox(profile.workStatus, "Unemployed"),
      student_checkbox: checkbox(profile.workStatus, "Student"),
      self_checkbox: checkbox(profile.workStatus, "Self-Employed"),
      others_checkbox:
        profile.workStatus &&
        !["Employed", "Unemployed", "Student", "Self-Employed"].includes(profile.workStatus)
          ? "☑"
          : "☐",
      otherWorkStatus:
        profile.workStatus &&
        !["Employed", "Unemployed", "Student", "Self-Employed"].includes(profile.workStatus)
          ? profile.workStatus
          : "",

      // Youth Classification
      inschool_checkbox: checkbox(profile.youthClassification, "In School Youth"),
      outschool_checkbox: checkbox(profile.youthClassification, "Out of School Youth"),
      working_checkbox: checkbox(profile.youthClassification, "Working Youth"),
      special_checkbox: checkbox(profile.youthClassification, "Youth with Specific Needs"),

      // Images
profileImage: profileImagePath && fs.existsSync(profileImagePath)
  ? { data: fs.readFileSync(profileImagePath, "base64") }
  : null,
signatureImage: signatureImagePath && fs.existsSync(signatureImagePath)
  ? { data: fs.readFileSync(signatureImagePath, "base64") }
  : null,

    });

    const buf = doc.getZip().generate({ type: "nodebuffer" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${profile.lastname || "KKProfile"}_${profile.firstname || ""}.docx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buf);
  } catch (err) {
    console.error("❌ Export error:", err);
    res.status(500).send("Error generating document");
  }
});

// ---------------------------
// Existing Routes
// ---------------------------

// Static routes (must come before dynamic :id)
router.get("/me", protect, ctrl.getMyProfile);
router.get("/me/image", protect, ctrl.getProfileImage);

// Admin-only routes
router.get("/export", protect, authorizeRoles("admin"), ctrl.exportProfilesToExcel);

// Profile submission with image
router.post(
  "/",
  protect,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "idImage", maxCount: 1 },
    { name: "signatureImage", maxCount: 1 },
  ]),
  ctrl.submitKKProfile
);

router.get("/cycle", protect, authorizeRoles("admin"), ctrl.filterProfilesByCycle);

// Get current user's KKProfile
router.get("/me", protect, async (req, res) => {
  const kkProfile = await KKProfile.findOne({ user: req.user.id });
  if (!kkProfile) return res.status(404).json({ error: "KKProfile not found" });
  res.json(kkProfile);
});

// Admin or Owner can manage a specific profile
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getProfileById);
router.put("/:id", protect, ctrl.updateProfileById);
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteProfileById);

// Main filter route (admin)
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllProfiles);

// Cycles and present cycle for dropdowns
router.get("/cycles-and-present", protect, authorizeRoles("admin"), ctrl.getCyclesAndPresent);

// Admin: Get KK Profile image by KKProfile ID
router.get("/image/:id", protect, authorizeRoles("admin"), ctrl.getKKProfileImageById);

module.exports = router;
