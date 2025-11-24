const KKProfile = require("../models/KKProfile");
const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const User = require("../models/User"); // Assuming the User model is in the same directory
const path = require("path");
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const Notification = require("../models/Notification");
const Announcement = require("../models/Announcement"); // Add at top if not present
async function getPresentCycle(formName) {
  // Prefer an explicitly open cycle (FormStatus.isOpen === true)
  const openStatus = await FormStatus.findOne({ formName, isOpen: true }).populate("cycleId");
  if (openStatus && openStatus.cycleId) return openStatus.cycleId;

  // If no open status, fallback to any FormStatus entry (may be closed)
  const anyStatus = await FormStatus.findOne({ formName }).populate("cycleId");
  if (anyStatus && anyStatus.cycleId) {
    // If there is no other open cycle (we already checked), treat this cycle as present
    return anyStatus.cycleId;
  }

  // Final fallback: return latest FormCycle record for the form (by year, cycleNumber)
  const latestCycle = await FormCycle.findOne({ formName }).sort({ year: -1, cycleNumber: -1 });
  if (latestCycle) return latestCycle;

  throw new Error("No active form cycle");
}

// POST /api/kkprofiling
exports.submitKKProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // Example for KK Profiling
    if (req.user.accessLevel === "limited" || req.user.age > 30) {
      return res.status(403).json({ error: "You are not eligible to submit this form due to age restrictions." });
    }

    const formStatus = await FormStatus.findOne({ formName: "KK Profiling" });
    if (!formStatus || !formStatus.isOpen) {
      return res.status(403).json({ error: "Form is currently closed" });
    }

    const cycleId = formStatus.cycleId;
    if (!cycleId || !mongoose.Types.ObjectId.isValid(cycleId)) {
      return res.status(400).json({ error: "Invalid or missing cycleId" });
    }

    const formCycle = await FormCycle.findById(cycleId);
    if (!formCycle) {
      return res.status(500).json({ error: "Active form cycle not found" });
    }

    const existing = await KKProfile.findOne({
      user: userId,
      formCycle: formCycle._id,
      isDeleted: false // Only block if not deleted
    });
    if (existing) {
      return res.status(409).json({ error: "Already submitted this cycle" });
    }

    const {
      lastname,
      firstname,
      middlename,
      suffix,
      gender,
      region,
      province,
      municipality,
      barangay,
      purok,
      email,
      contactNumber,
      civilStatus,
      youthAgeGroup,
      youthClassification,
      specificNeedType,
      educationalBackground,
      workStatus,
      registeredSKVoter,
      registeredNationalVoter,
      votedLastSKElection,
      attendedKKAssembly,
      attendanceCount,
      reasonDidNotAttend,
    } = req.body;

    // Normalize attendedKKAssembly: frontend may send "true"/"false" strings or booleans.
    const attendedBool = (attendedKKAssembly === true || attendedKKAssembly === 'true');

    if (attendedBool && !attendanceCount) {
      return res.status(400).json({ error: "Attendance count is required" });
    }
    if (!attendedBool && !reasonDidNotAttend) {
      return res
        .status(400)
        .json({ error: "Reason for not attending is required" });
    }

    const user = await User.findById(req.user.id);
    const birthday = user.birthday; // use this value for the profile

    // Determine authoritative age to store on KKProfile.
    // Priority: req.body.age -> user's birthday -> req.body.birthday -> user.age
    const parseAgeFromBirthday = bd => {
      if (!bd) return null;
      const d = new Date(bd);
      if (isNaN(d)) return null;
      const today = new Date();
      let a = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
      return a;
    };

    let ageToSave = null;
    if (req.body && typeof req.body.age !== 'undefined' && req.body.age !== null && req.body.age !== '') {
      const n = Number(req.body.age);
      if (!isNaN(n)) ageToSave = n;
    }
    if (ageToSave === null) {
      const fromUserBirthday = parseAgeFromBirthday(user.birthday);
      if (fromUserBirthday !== null) ageToSave = fromUserBirthday;
    }
    if (ageToSave === null && req.body && req.body.birthday) {
      const fromBodyBirthday = parseAgeFromBirthday(req.body.birthday);
      if (fromBodyBirthday !== null) ageToSave = fromBodyBirthday;
    }
    if (ageToSave === null && typeof user.age !== 'undefined' && user.age !== null) {
      const ua = Number(user.age);
      if (!isNaN(ua)) ageToSave = ua;
    }
    if (ageToSave === null) {
      if (req.files?.profileImage) fs.unlink(req.files.profileImage[0].path, () => {});
      if (req.files?.idImage) fs.unlink(req.files.idImage[0].path, () => {});
      if (req.files?.signatureImage) fs.unlink(req.files.signatureImage[0].path, () => {});
      return res.status(400).json({ error: "Age is required or could not be determined from birthday." });
    }

    const newProfile = new KKProfile({
      user: userId,
      formCycle: formCycle._id,
      lastname,
      firstname,
      middlename,
      suffix,
      gender,
      region,
      province,
      municipality,
      barangay,
      purok,
      email,
      contactNumber,
      civilStatus,
      youthAgeGroup,
      youthClassification,
      specificNeedType: youthClassification === "Youth with Specific Needs" ? specificNeedType : null,
      educationalBackground,
      workStatus,
      registeredSKVoter,
      registeredNationalVoter,
      votedLastSKElection,
      attendedKKAssembly,
      attendanceCount: attendedBool ? req.body.attendanceCount : undefined,
      reasonDidNotAttend: attendedBool ? undefined : req.body.reasonDidNotAttend,

      // ✅ Save uploaded images if present
      profileImage: req.files?.profileImage ? req.files.profileImage[0].path : null, // Cloudinary URL
      idImagePath: req.files?.idImage ? req.files.idImage[0].path : null,           // Cloudinary URL
      signatureImagePath: req.files?.signatureImage ? req.files.signatureImage[0].path : null, // Cloudinary URL

      age: ageToSave,
      birthday,
    });

    await newProfile.save();

    // New code to populate profile and emit socket event
    const populatedProfile = await KKProfile.findById(newProfile._id)
      .populate("user", "username email birthday age")
      .populate("formCycle");
    req.app.get("io").emit("kk-profile:newSubmission", populatedProfile);

    await Notification.create({
      type: "kk-profile",
      event: "newSubmission",
      message: `New KK Profile submission from user ${userId}`,
      referenceId: newProfile._id,
      cycleId: formCycle._id,
      createdAt: new Date(),
      read: false,
    });

    // Emit socket event for real-time updates
    if (req.app.get("io")) {
      req.app.get("io").emit("kk-profile:newSubmission", {
        id: newProfile._id,
        userId,
        cycleId: formCycle._id
      });
    }

    res.status(201).json({ message: "Profile submitted successfully" });

  } catch (error) {
    console.error("Error submitting KK Profile:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// // GET /api/kkprofiling/all?cycleId=<formCycleId>
// exports.getAllKKProfiles = async (req, res) => {
//   try {
//     const { cycleId } = req.query;
//     const filter = cycleId ? { formCycle: cycleId } : {};

//     const profiles = await KKProfile.find(filter)
//       .populate("user", "username email")
//       .populate("formCycle", "cycleNumber year")
//       .sort({ submittedAt: -1 });

//     res.status(200).json(profiles);
//   } catch (error) {
//     console.error("Error fetching KK Profiles:", error);
//     res.status(500).json({ error: "Failed to fetch KK Profiles" });
//   }
// };

// GET /api/kkprofiling/:id
exports.getProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id)
      .populate("user", "username email birthday age");
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Mark as read if admin and not already read
    if (req.user && req.user.role === "admin" && !profile.isRead) {
      profile.isRead = true;
      await profile.save();

      // Emit socket event for real-time notification removal
      if (req.app.get("io")) {
        req.app.get("io").emit("kk-profile:read", {
          id: profile._id
        });
      }
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/kkprofiling/:id
const cloudinary = require('../config/cloudinaryConfig');

// Helper: derive Cloudinary public_id from a full Cloudinary URL
function publicIdFromUrl(url) {
  try {
    if (!url) return null;
    const u = new URL(url);
    // path after /upload/
    const parts = u.pathname.split('/upload/');
    if (parts.length < 2) return null;
    let after = parts[1];
    // remove possible version prefix v123456/
    after = after.replace(/^v[0-9]+\//, '');
    // remove file extension
    const lastDot = after.lastIndexOf('.');
    if (lastDot !== -1) after = after.substring(0, lastDot);
    return after;
  } catch (e) {
    return null;
  }
}

exports.updateProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    if (profile.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    // If new files were uploaded via multer (CloudinaryStorage), replace the stored URLs
    try {
      if (req.files && req.files.profileImage && req.files.profileImage[0]) {
        // delete old image from Cloudinary if possible
        const oldUrl = profile.profileImage;
        const oldPublicId = publicIdFromUrl(oldUrl);
        if (oldPublicId) {
          try { await cloudinary.uploader.destroy(oldPublicId); } catch (e) { console.warn('Failed to destroy old profile image', e); }
        }
        // multer-storage-cloudinary exposes path (the secure URL)
        profile.profileImage = req.files.profileImage[0].path;
      }

      if (req.files && req.files.signatureImage && req.files.signatureImage[0]) {
        const oldSigUrl = profile.signatureImagePath;
        const oldSigPublicId = publicIdFromUrl(oldSigUrl);
        if (oldSigPublicId) {
          try { await cloudinary.uploader.destroy(oldSigPublicId); } catch (e) { console.warn('Failed to destroy old signature image', e); }
        }
        profile.signatureImagePath = req.files.signatureImage[0].path;
      }

      if (req.files && req.files.idImage && req.files.idImage[0]) {
        // optional id image replacement
        const oldIdUrl = profile.idImagePath;
        const oldIdPublicId = publicIdFromUrl(oldIdUrl);
        if (oldIdPublicId) {
          try { await cloudinary.uploader.destroy(oldIdPublicId); } catch (e) { console.warn('Failed to destroy old id image', e); }
        }
        profile.idImagePath = req.files.idImage[0].path;
      }
    } catch (e) {
      console.warn('File processing during update failed', e);
    }

    // Apply other body updates (coerce types as needed)
    // Merge req.body into profile (careful not to overwrite image fields already set above)
    let body = Object.assign({}, req.body);

    // If client sent _removed flags (as JSON string when using FormData), parse them
    let removedFlags = null;
    if (body._removed) {
      try {
        removedFlags = typeof body._removed === 'string' ? JSON.parse(body._removed) : body._removed;
      } catch (e) {
        // ignore parse error, but keep the raw value
        removedFlags = body._removed;
      }
    }

    // If client asked to remove images without replacement, delete old Cloudinary resources and clear fields
    try {
      if (removedFlags && removedFlags.profileImage) {
        const oldUrl = profile.profileImage;
        const oldPublicId = publicIdFromUrl(oldUrl);
        if (oldPublicId) {
          try { await cloudinary.uploader.destroy(oldPublicId); } catch (e) { console.warn('Failed to destroy removed profile image', e); }
        }
        profile.profileImage = null;
      }
      if (removedFlags && removedFlags.signatureImage) {
        const oldUrl = profile.signatureImagePath;
        const oldPublicId = publicIdFromUrl(oldUrl);
        if (oldPublicId) {
          try { await cloudinary.uploader.destroy(oldPublicId); } catch (e) { console.warn('Failed to destroy removed signature image', e); }
        }
        profile.signatureImagePath = null;
      }
      if (removedFlags && removedFlags.idImage) {
        const oldUrl = profile.idImagePath;
        const oldPublicId = publicIdFromUrl(oldUrl);
        if (oldPublicId) {
          try { await cloudinary.uploader.destroy(oldPublicId); } catch (e) { console.warn('Failed to destroy removed id image', e); }
        }
        profile.idImagePath = null;
      }
    } catch (e) {
      console.warn('Error handling removed flags', e);
    }

    // Remove any image fields from body if present (we already handled files above)
    delete body.profileImage;
    delete body.signatureImagePath;
    delete body.signatureImage;
    delete body.idImagePath;
    delete body.idImage;
    delete body._removed;

    // Basic coercion for common form values sent via FormData (strings -> booleans/numbers/dates)
    const parseBool = v => {
      if (v === true || v === false) return v;
      if (!v && v !== 0) return v;
      const s = String(v).trim().toLowerCase();
      if (s === 'true' || s === 'yes') return true;
      if (s === 'false' || s === 'no') return false;
      return v;
    };
    const parseNumber = v => {
      if (v === null || v === undefined || v === '') return v;
      const n = Number(v);
      return isNaN(n) ? v : n;
    };

    if ('attendedKKAssembly' in body) body.attendedKKAssembly = parseBool(body.attendedKKAssembly);
    if ('registeredSKVoter' in body) body.registeredSKVoter = parseBool(body.registeredSKVoter);
    if ('registeredNationalVoter' in body) body.registeredNationalVoter = parseBool(body.registeredNationalVoter);
    if ('votedLastSKElection' in body) body.votedLastSKElection = parseBool(body.votedLastSKElection);
    if ('attendanceCount' in body) body.attendanceCount = parseNumber(body.attendanceCount);
    if ('birthday' in body && body.birthday) {
      // convert YYYY-MM-DD or ISO strings to Date
      const bd = new Date(body.birthday);
      if (!isNaN(bd)) body.birthday = bd;
    }

    // Remove empty strings to avoid enum/validation collisions
    Object.keys(body).forEach(k => {
      if (body[k] === '') delete body[k];
    });

    // Merge sanitized body into profile
    Object.assign(profile, body);

    try {
      await profile.save();
    } catch (saveErr) {
      console.error('Failed to save updated profile:', saveErr);
      // give more context in development; do not expose stack in production
      return res.status(400).json({ error: saveErr.message || 'Validation error', details: saveErr.errors || null });
    }

    res.json({ message: "Profile updated", profile });
  } catch (err) {
    console.error('Update profile error', err);
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/kkprofiling/:id
exports.deleteProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id).populate("user");
    if (!profile) {
      console.error("Soft delete failed: Profile not found", req.params.id);
      return res.status(404).json({ error: "Profile not found" });
    }

    // Soft delete: set isDeleted and deletedAt
    profile.isDeleted = true;
    profile.deletedAt = new Date();
    await profile.save();

    // Remove related notifications
    await Notification.deleteMany({ referenceId: profile._id });

    // Emit socket event for real-time update
    if (req.app.get("io")) {
      req.app.get("io").emit("kk-profile:deleted", { id: profile._id });
    }

    // Send announcement to the user
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    await Announcement.create({
      title: "KK Profiling Form Deleted",
      content: `The admin has observed that your KK Profiling form has inaccuracies. As a result, your KK Profiling form for this cycle has been deleted and moved to the recycle bin. You may submit a new form if the cycle is still open, please make sure all information is accurate.`,
      category: "KK Profiling",
      eventDate: new Date(),
      expiresAt,
      createdBy: req.user.id,
      recipient: profile.user._id,
      isPinned: false,
      isActive: true,
      viewedBy: [],
    });

    res.json({ message: "Profile moved to recycle bin." });
  } catch (err) {
    console.error("Soft delete error:", err); // <-- Add this line
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/kkprofiling/me
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const formStatus = await FormStatus.findOne({ formName: "KK Profiling" });

    if (
      !formStatus ||
      !formStatus.cycleId ||
      !mongoose.Types.ObjectId.isValid(formStatus.cycleId)
    ) {
      return res.status(404).json({ error: "No active cycle found." });
    }

    const profile = await KKProfile.findOne({
      user: userId,
      formCycle: formStatus.cycleId,
      isDeleted: false // <-- Only get non-deleted profiles
    }).populate("formCycle");

    if (!profile) {
      return res.status(404).json({
        error: "You have not submitted a KK profile yet for the current cycle.",
      });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Get my profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/kkprofiling/me/previous
// Return the most recent non-deleted KKProfile for the authenticated user (any cycle)
exports.getMyLatestProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // Find latest profile by submittedAt (fallback to creation order)
    const profile = await KKProfile.findOne({ user: userId, isDeleted: false })
      .sort({ submittedAt: -1 })
      .populate('formCycle');

    if (!profile) {
      return res.status(404).json({ error: 'No previous KK profile found.' });
    }

    res.status(200).json(profile);
  } catch (err) {
    console.error('getMyLatestProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/kkprofiling/me/image
exports.getProfileImage = async (req, res) => {
  try {
    const formStatus = await FormStatus.findOne({ formName: "KK Profiling" });

    if (
      !formStatus ||
      !formStatus.cycleId ||
      !mongoose.Types.ObjectId.isValid(formStatus.cycleId)
    ) {
      return res.status(404).json({ error: "No active cycle found." });
    }

    const profile = await KKProfile.findOne({
      user: req.user.id,
      formCycle: formStatus.cycleId,
    });

    if (!profile || !profile.profileImage) {
      return res.status(404).json({ error: "No image found" });
    }

    // If the stored profileImage is already a full URL (e.g., Cloudinary secure URL),
    // return it directly. Otherwise, build a server-prefixed URL for local files.
    let imageUrl = profile.profileImage;
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      imageUrl = `${req.protocol}://${req.get("host")}/${imageUrl}`;
    }

    res.status(200).json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: "Error fetching image" });
  }
};

// Filter KK Profiles by cycle number and year
exports.filterProfilesByCycle = async (req, res) => {
  try {
    const { cycleNumber, year } = req.query;

    if (!cycleNumber || !year) {
      return res
        .status(400)
        .json({ error: "cycleNumber and year are required" });
    }

    const cycle = await FormCycle.findOne({
      formName: "KK Profiling",
      cycleNumber: Number(cycleNumber),
      year: Number(year),
    });

    if (!cycle) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    const profiles = await KKProfile.find({ formCycle: cycle._id }).populate(
      "user",
      "username email"
    );

    res.status(200).json(profiles);
  } catch (error) {
    console.error("KK filter error:", error);
    res.status(500).json({ error: "Failed to filter KK profiles" });
  }
};

// Main filter endpoint
exports.getAllProfiles = async (req, res) => {
  try {
    const {
      year,
      cycle,
      all,
      classification,
      purok,
      civilStatus,
      youthAgeGroup,
      youthClassification,
      educationalBackground,
      workStatus,
      registeredSKVoter,
      registeredNationalVoter,
      votedLastSKElection,
    } = req.query;
    let cycleDoc = null;
    let filter = {};

    // Always exclude deleted profiles
    filter.isDeleted = false;

    if (all === "true") {
      if (classification) filter.youthClassification = classification;
      if (purok) filter.purok = purok;
      if (civilStatus) filter.civilStatus = civilStatus;
      if (youthAgeGroup) filter.youthAgeGroup = youthAgeGroup;
      if (youthClassification) filter.youthClassification = youthClassification;
      if (educationalBackground)
        filter.educationalBackground = educationalBackground;
      if (workStatus) filter.workStatus = workStatus;
      if (registeredSKVoter !== undefined)
        filter.registeredSKVoter = registeredSKVoter === "true";
      if (registeredNationalVoter !== undefined)
        filter.registeredNationalVoter = registeredNationalVoter === "true";
      if (votedLastSKElection !== undefined)
        filter.votedLastSKElection = votedLastSKElection === "true";
      const profiles = await KKProfile.find(filter)
        .populate("formCycle")
        .populate("user", "username email birthday age");
      return res.json(profiles);
    }

    if (year && cycle) {
      cycleDoc = await FormCycle.findOne({
        formName: "KK Profiling",
        year: Number(year),
        cycleNumber: Number(cycle),
      });
      if (!cycleDoc) {
        return res.status(404).json({ error: "Specified cycle not found" });
      }
    } else {
      try {
        cycleDoc = await getPresentCycle("KK Profiling");
      } catch (err) {
        return res.status(404).json({ error: err.message });
      }
    }

    filter.formCycle = cycleDoc._id;
    if (classification) filter.youthClassification = classification;
    if (purok) filter.purok = purok;
    if (civilStatus) filter.civilStatus = civilStatus;
    if (youthAgeGroup) filter.youthAgeGroup = youthAgeGroup;
    if (youthClassification) filter.youthClassification = youthClassification;
    if (educationalBackground)
      filter.educationalBackground = educationalBackground;
    if (workStatus) filter.workStatus = workStatus;
    if (registeredSKVoter !== undefined)
      filter.registeredSKVoter = registeredSKVoter === "true";
    if (registeredNationalVoter !== undefined)
      filter.registeredNationalVoter = registeredNationalVoter === "true";
    if (votedLastSKElection !== undefined)
      filter.votedLastSKElection = votedLastSKElection === "true";

    const profiles = await KKProfile.find(filter)
      .populate("formCycle")
      .populate("user", "username email birthday age");

    res.json(profiles);
  } catch (err) {
    console.error("getAllProfiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Endpoint to get all cycles and present cycle
exports.getCyclesAndPresent = async (req, res) => {
  try {
    const allCycles = await FormCycle.find({ formName: "KK Profiling" }).sort({
      year: -1,
      cycleNumber: -1,
    });
    let presentCycle = null;
    try {
      presentCycle = await getPresentCycle("KK Profiling");
    } catch {
      presentCycle = null;
    }
    res.json({ allCycles, presentCycle });
  } catch (err) {
    res.status(500).json({ error: "Failed to load cycles" });
  }
};

exports.getKKProfileImageById = async (req, res) => {
  // expects :id to be the KKProfile _id, not the user _id
  const kkProfile = await KKProfile.findById(req.params.id);
  if (!kkProfile || !kkProfile.profileImage) {
    return res.status(404).json({ error: "KK Profile or profile image not found" });
  }
  const imagePath = path.join(__dirname, "../uploads/profile_images", kkProfile.profileImage);
  fs.access(imagePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).json({ error: "Image file not found" });
    res.sendFile(imagePath);
  });
};

// GET /api/kkprofiling/export/:id
exports.exportKKProfileDocx = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id).populate("user");
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Load the template
    const templatePath = path.join(__dirname, "../kk_profiling_template.docx");
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: "Template file not found" });
    }
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip);

    // Prepare data for template
    // Prefer stored age in DB (profile.age or profile.user.age); otherwise compute from birthday
    const storedAge = (typeof profile.age !== 'undefined' && profile.age !== null) ? Number(profile.age) : null;
    const userAge = (profile.user && typeof profile.user.age !== 'undefined' && profile.user.age !== null) ? Number(profile.user.age) : null;
    const birthdayDate = profile.user?.birthday ? new Date(profile.user.birthday) : null;
    const birthday = birthdayDate ? birthdayDate.toLocaleDateString() : "";
    const birthMonth = birthdayDate ? birthdayDate.getMonth() + 1 : "N/A";
    const birthDay = birthdayDate ? birthdayDate.getDate() : "N/A";
    const birthYear = birthdayDate ? birthdayDate.getFullYear() : "N/A";
    const today = new Date();
    const computedAge = birthdayDate
      ? today.getFullYear() - birthYear - (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay) ? 1 : 0)
      : "N/A";
    const age = (storedAge !== null && !isNaN(storedAge)) ? storedAge : (userAge !== null && !isNaN(userAge) ? userAge : computedAge);
    const data = {
      lastname: profile.lastname || "",
      firstname: profile.firstname || "",
      middlename: profile.middlename || "",
      suffix: profile.suffix || "",
      gender: profile.gender || "",
      region: profile.region || "",
      province: profile.province || "",
      municipality: profile.municipality || "",
      barangay: profile.barangay || "",
      purok: profile.purok || "",
      email: profile.email || "",
      contactNumber: profile.contactNumber || "",
      civilStatus: profile.civilStatus || "",
      youthAgeGroup: profile.youthAgeGroup || "",
      youthClassification: profile.youthClassification || "",
      educationalBackground: profile.educationalBackground || "",
      workStatus: profile.workStatus || "",
      registeredSKVoter: profile.registeredSKVoter ? "Yes" : "No",
      registeredNationalVoter: profile.registeredNationalVoter ? "Yes" : "No",
      votedLastSKElection: profile.votedLastSKElection ? "Yes" : "No",
      attendedKKAssembly: profile.attendedKKAssembly ? "Yes" : "No",
      attendanceCount: profile.attendanceCount || "",
      reasonDidNotAttend: profile.reasonDidNotAttend || "",
      birthday: birthday,
      age: age,
      // Add this line for the dropdown value:
      specificNeedType: profile.specificNeedType || "",
    };

    doc.render(data);

    const buf = doc.getZip().generate({ type: "nodebuffer" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${profile.lastname || "KKProfile"}.docx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buf);
  } catch (err) {
    console.error("Error exporting DOCX:", err);
    res.status(500).json({ error: "Failed to export DOCX" });
  }
};

exports.restoreProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile || !profile.isDeleted) {
      return res.status(404).json({ error: "Profile not found or not deleted" });
    }

    // Check for duplicate (non-deleted) profile for the same user and cycle
    const duplicate = await KKProfile.findOne({
      user: profile.user,
      formCycle: profile.formCycle,
      isDeleted: false
    });

    if (duplicate) {
      return res.status(409).json({
        error: "The User already submitted a new profile for this cycle, your only option is to permanently delete this profile."
      });
    }

    profile.isDeleted = false;
    profile.deletedAt = null;
    await profile.save();

    // Send announcement to the user
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    await Announcement.create({
      title: "KK Profiling Form Restored",
      content: `Your KK Profiling form for this cycle has been restored.`,
      category: "KK Profiling",
      eventDate: new Date(),
      expiresAt,
      createdBy: req.user.id,
      recipient: profile.user._id, // <-- set recipient
      isPinned: false,
      isActive: true,
      viewedBy: [],
    });

    res.json({ message: "Profile restored" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getDeletedProfiles = async (req, res) => {
  try {
    const profiles = await KKProfile.find({ isDeleted: true });
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Permanent delete controller
exports.permanentlyDeleteProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Remove related notifications
    await Notification.deleteMany({ referenceId: profile._id });

    // Emit socket event for real-time update
    if (req.app.get("io")) {
      req.app.get("io").emit("kk-profile:deleted", { id: profile._id });
    }

    res.json({ message: "Profile permanently deleted." });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};



exports.exportKKProfilesExcelTemplate = async (req, res) => {
  try {
    const templatePath = path.resolve(__dirname, '../templates/kk_profiling_template.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Excel template file not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.worksheets[0]; // Use the first worksheet

    // Check if year and cycle are provided in the query
    const { year, cycle } = req.query;

    let formCycle;
    if (year && cycle) {
      // Fetch the specific cycle based on year, cycle number, and formName
      formCycle = await FormCycle.findOne({
        formName: "KK Profiling",
        year: Number(year),
        cycleNumber: Number(cycle),
      });

      if (!formCycle) {
        return res.status(404).json({ error: `No cycle found for year ${year} and cycle ${cycle}` });
      }
    } else {
      // Fetch the present (open) cycle
      formCycle = await FormCycle.findOne({ formName: "KK Profiling", isOpen: true });
      if (!formCycle) {
        return res.status(404).json({ error: 'No open cycle found' });
      }
    }

    // Fetch KK Profiles for the selected cycle
    let profiles = await KKProfile.find({ formCycle: formCycle._id, isDeleted: false }).populate("user", "birthday");

    if (!profiles.length) {
      return res.status(404).json({ error: 'No KK Profiles found for the selected cycle' });
    }

    // Sort profiles by the purok number (ascending)
    profiles = profiles.sort((a, b) => {
      const purokA = parseInt(a.purok) || 0; // Default to 0 if purok is not a number
      const purokB = parseInt(b.purok) || 0;
      return purokA - purokB;
    });

    // Start writing data at row 4 (since rows 1-3 are headers)
    let rowNum = 4;

    profiles.forEach(profile => {
      const fullName = `${(profile.lastname || '').toUpperCase()}, ${(profile.firstname || '').toUpperCase()} ${(profile.middlename || '').toUpperCase()}`.trim();

      // Prefer stored age in DB (profile.age or profile.user.age); otherwise extract birthday details and compute age
      const storedAge = (typeof profile.age !== 'undefined' && profile.age !== null) ? Number(profile.age) : null;
      const userAge = (profile.user && typeof profile.user.age !== 'undefined' && profile.user.age !== null) ? Number(profile.user.age) : null;
      const birthday = profile.user?.birthday ? new Date(profile.user.birthday) : null;
      const birthMonth = birthday ? birthday.getMonth() + 1 : "N/A"; // Months are 0-indexed
      const birthDay = birthday ? birthday.getDate() : "N/A";
      const birthYear = birthday ? birthday.getFullYear() : "N/A";

      // Compute age dynamically only if not stored on profile/user
      const today = new Date();
      const computedAge = birthday
        ? today.getFullYear() - birthYear - (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay) ? 1 : 0)
        : "N/A";
      const age = (storedAge !== null && !isNaN(storedAge)) ? storedAge : (userAge !== null && !isNaN(userAge) ? userAge : computedAge);

      // Gender logic: M for Male, F for Female
      const gender = profile.gender === "Male" ? "M" : profile.gender === "Female" ? "F" : "N/A";

      // Civil status in all caps
      const civilStatus = (profile.civilStatus || "N/A").toUpperCase();

      // Youth classification logic
      let youthClassification = "N/A";
      if (profile.youthClassification === "In School Youth") {
          youthClassification = "ISY";
        } else if (profile.youthClassification === "Out of School Youth") {
          youthClassification = "OSY";
        } else if (profile.youthClassification === "Working Youth") {
          youthClassification = "WY";
        } else if (profile.youthClassification === "Youth with Specific Needs") {
          youthClassification = "YSN";
        }
      const email = profile.email || "N/A";
      const contactNumber = profile.contactNumber || "N/A";
      const purok = profile.purok ? `PUROK ${profile.purok}` : "PUROK N/A"; // Add "PUROK" prefix

      // Educational background and work status
      const educationalBackground = profile.educationalBackground || "N/A";
      const workStatus = profile.workStatus || "N/A";

      // Registered National Voter and Voted Last SK Election
      const registeredNationalVoter = profile.registeredNationalVoter ? "Y" : "N";
      const votedLastSKElection = profile.votedLastSKElection ? "Y" : "N";

      // Attended KK Assembly logic
      let attendedKKAssembly = profile.attendedKKAssembly ? "Y" : "N";
      let attendanceOrReason = profile.attendedKKAssembly
        ? profile.attendanceCount || "N/A" // If attended, show attendance count
        : profile.reasonDidNotAttend || "N/A"; // If not attended, show reason

      // Write data to the existing row
      worksheet.getCell(`A${rowNum}`).value = "IV-A";                // Region
      worksheet.getCell(`B${rowNum}`).value = "BATANGAS";            // Province
      worksheet.getCell(`C${rowNum}`).value = "CALACA CITY";         // Municipality
      worksheet.getCell(`D${rowNum}`).value = "PUTING BATO WEST";    // Barangay
      worksheet.getCell(`E${rowNum}`).value = fullName;              // Full Name
      worksheet.getCell(`F${rowNum}`).value = age;                   // Age
      worksheet.getCell(`G${rowNum}`).value = birthMonth;            // Birth Month
      worksheet.getCell(`H${rowNum}`).value = birthDay;              // Birth Day
      worksheet.getCell(`I${rowNum}`).value = birthYear;             // Birth Year
      worksheet.getCell(`J${rowNum}`).value = gender;                // Gender
      worksheet.getCell(`K${rowNum}`).value = civilStatus;           // Civil Status
      worksheet.getCell(`L${rowNum}`).value = youthClassification;   // Youth Classification
      worksheet.getCell(`M${rowNum}`).value = profile.youthAgeGroup  // Youth Age Group
      worksheet.getCell(`N${rowNum}`).value = email;                 // Email Address
      worksheet.getCell(`O${rowNum}`).value = contactNumber;         // Contact Number
      worksheet.getCell(`P${rowNum}`).value = purok;                 // Purok
      worksheet.getCell(`Q${rowNum}`).value = educationalBackground; // Educational Background
      worksheet.getCell(`R${rowNum}`).value = workStatus;            // Work Status
      worksheet.getCell(`S${rowNum}`).value = registeredNationalVoter; // Registered National Voter
      worksheet.getCell(`T${rowNum}`).value = votedLastSKElection;   // Voted Last SK Election
      worksheet.getCell(`U${rowNum}`).value = attendedKKAssembly;    // Attended KK Assembly
      worksheet.getCell(`V${rowNum}`).value = attendanceOrReason;    // Attendance Count or Reason

      rowNum++; // Move to the next row
    });

    // Set headers for the response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=kk_profiling_export_${year || 'present'}_cycle_${cycle || 'open'}.xlsx`);

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export KK Profiling data' });
  }
};
