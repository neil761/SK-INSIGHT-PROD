const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/lgbtqProfileController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer();
const uploadLGBTQIdImage = require("../middleware/uploadLGBTQIdImage");
const path = require("path");
const fs = require("fs");

// New imports for DOCX generation
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ImageModule = require("docxtemplater-image-module-free");

// Checkbox utility
function checkbox(value, match) {
  if (value === undefined || value === null) return "☐";
  if (Array.isArray(value)) {
    for (let i = value.length - 1; i >= 0; i--) {
      const v = value[i];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        value = v;
        break;
      }
    }
    if (Array.isArray(value)) value = '';
  }
  const matchStr = typeof match === 'string' ? match.trim().toLowerCase() : String(match).trim().toLowerCase();
  if (typeof value === "boolean") {
    if (typeof match === 'boolean') return value === match ? "☑" : "☐";
    if (matchStr === 'yes' || matchStr === 'true') return value === true ? "☑" : "☐";
    if (matchStr === 'no' || matchStr === 'false') return value === false ? "☑" : "☐";
    return String(value).toLowerCase() === matchStr ? "☑" : "☐";
  }
  const valStr = typeof value === "string" ? value : String(value);
  return valStr.trim().toLowerCase() === matchStr ? "☑" : "☐";
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
      return [150, 80];
    },
  };
}

// === USER ROUTES ===
router.post(
  "/",
  protect,
  uploadLGBTQIdImage.fields([
    { name: "idImageFront", maxCount: 1 },
    { name: "idImageBack", maxCount: 1 }
  ]),
  ctrl.submitLGBTQProfile
);

router.get("/me/profile", protect, ctrl.getMyProfile);
// Return profile for active cycle or most recent fallback
router.get("/me/recent", protect, ctrl.getMyRecentProfile);

// Update my profile (user-level) - allow multipart so users can replace id images
router.put(
  "/me",
  protect,
  uploadLGBTQIdImage.fields([
    { name: "idImageFront", maxCount: 1 },
    { name: "idImageBack", maxCount: 1 }
  ]),
  ctrl.updateMyProfile
);

// Route to get front ID image by filename
router.get("/id-image/front/:filename", protect, (req, res) => {
  const filePath = path.join(__dirname, "../uploads/lgbtq_id_images", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Front ID image not found" });
  }
});

// Route to get back ID image by filenamex
router.get("/id-image/back/:filename", protect, (req, res) => {
  const filePath = path.join(__dirname, "../uploads/lgbtq_id_images", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Back ID image not found" });
  }
});

// === ADMIN ROUTES ===

// Export profiles to Excel
router.get(
  "/export/excel",
  protect,
  authorizeRoles("admin"),
  ctrl.exportProfilesToExcel
);

// **IMPORTANT: Export single LGBTQ profile to Word - MUST BE BEFORE /:id route**
router.get("/export/:id", protect, async (req, res) => {
  try {
    console.log("📥 Export request for profile:", req.params.id);
    
    const LGBTQProfile = require("../models/LGBTQProfile");
    const profile = await LGBTQProfile.findById(req.params.id).populate("user", "birthday age");
    
    if (!profile) {
      console.log("❌ Profile not found:", req.params.id);
      return res.status(404).send("Profile not found");
    }

    // ✅ Allow: Admin exports any profile, user exports their own
    if (req.user.role !== "admin" && String(profile.user._id) !== String(req.user.id)) {
      console.log("❌ Not authorized to export profile:", req.params.id);
      return res.status(403).json({ error: "Not authorized to export this profile" });
    }

    // Changed from lgbtqForm.docx to lgbtq.docx
    const templatePath = path.resolve(__dirname, "../templates/lgbtq.docx");
    console.log("📄 Template path:", templatePath);
    console.log("📄 Template exists:", fs.existsSync(templatePath));
    
    if (!fs.existsSync(templatePath)) {
      console.log("❌ Template file not found at:", templatePath);
      return res.status(500).json({ error: "Template file not found", path: templatePath });
    }

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      modules: [new ImageModule(getImageModuleOptions())],
      paragraphLoop: true,
      linebreaks: true,
    });

    function formatDateDMY(date) {
      if (!date) return "";
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }

    // Render data into template
    console.log("✍️ Rendering template with profile data...");
    doc.render({
      lastname: profile.lastname || "",
      firstname: profile.firstname || "",
      middlename: profile.middlename || "",
      middle_initial: profile.middlename && profile.middlename.length > 0
        ? profile.middlename.trim()[0].toUpperCase() + "."
        : "",
      age: profile.user?.age || "",
      birthday: formatDateDMY(profile.user?.birthday),
      submittedAt: formatDateDMY(profile.createdAt),
      sexAssignedAtBirth: profile.sexAssignedAtBirth || "",
      male: checkbox(profile.sexAssignedAtBirth, "Male"),
      female: checkbox(profile.sexAssignedAtBirth, "Female"),
      lesbian: checkbox(profile.lgbtqClassification, "Lesbian"),
      gay: checkbox(profile.lgbtqClassification, "Gay"),
      bisexual: checkbox(profile.lgbtqClassification, "Bisexual"),
      queer: checkbox(profile.lgbtqClassification, "Queer"),
      intersex: checkbox(profile.lgbtqClassification, "Intersex"),
      asexual: checkbox(profile.lgbtqClassification, "Asexual"),
      transgender: checkbox(profile.lgbtqClassification, "Transgender"),
      other: checkbox(profile.lgbtqClassification, "Other"),
    });

    const buf = doc.getZip().generate({ type: "nodebuffer" });

    console.log("✅ Document generated successfully, sending download...");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${profile.lastname || "LGBTQProfile"}_${profile.firstname || ""}.docx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buf);
  } catch (err) {
    console.error("❌ LGBTQ Export error:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: "Error generating document", message: err.message });
  }
});

// Get all profiles
router.get("/", protect, authorizeRoles("admin"), ctrl.getAllProfiles);

// Get filtered profiles by cycle
router.get("/filter", protect, authorizeRoles("admin"), ctrl.filterProfilesByCycle);

// Get deleted profiles (Recycle Bin)
router.get("/deleted", protect, authorizeRoles("admin"), ctrl.getDeletedProfiles);

// **GENERIC :id routes AFTER specific routes**
// Get single profile by ID
router.get("/:id", protect, authorizeRoles("admin"), ctrl.getProfileById);

// Update profile by ID
router.put("/:id", protect, authorizeRoles("admin"), ctrl.updateProfileById);

// Soft delete profile by ID
router.delete("/:id", protect, authorizeRoles("admin"), ctrl.deleteProfileById);

// Restore profile by ID
router.put("/:id/restore", protect, authorizeRoles("admin"), ctrl.restoreProfileById);

// Permanent delete profile by ID
router.delete("/:id/permanent", protect, authorizeRoles("admin"), ctrl.permanentlyDeleteProfileById);

module.exports = router;
