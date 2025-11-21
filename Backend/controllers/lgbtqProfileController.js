const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const KKProfile = require("../models/KKProfile");
const LGBTQProfile = require("../models/LGBTQProfile");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const Notification = require("../models/Notification"); // <-- Import Notification model
const Announcement = require("../models/Announcement"); // Add at top if not present
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinaryConfig");
// ...existing imports...
// Helper to get demographics from LGBTQProfile only
async function getDemographics(profile) {
  // Make sure profile.user is populated with birthday and age
  const user = profile.user;
  return {
    lastname: profile.lastname,
    firstname: profile.firstname,
    middlename: profile.middlename,
    birthday: user?.birthday, // Reference from User
    age: user?.age,           // Reference from User
    sexAssignedAtBirth: profile.sexAssignedAtBirth,
  };
}

// Submit new profile
exports.submitLGBTQProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",
    });

        if (req.user.accessLevel === "limited" || req.user.age > 30) {
      return res.status(403).json({ error: "You are not eligible to submit this form due to age restrictions." });
    }

    if (!formStatus || !formStatus.isOpen) {
      return res.status(403).json({ success: false, error: "Form is currently closed" });
    }

    // Check for duplicate submission
    const existing = await LGBTQProfile.findOne({
      user: userId,
      formCycle: formStatus.cycleId,
      isDeleted: false 
    });
    if (existing) {
      return res.status(409).json({ success: false, error: "You already submitted during this form cycle" });
    }

    // Check for required demographics and images
    const { lastname, firstname, middlename, sexAssignedAtBirth, lgbtqClassification } = req.body;
    if (!lastname || !firstname || !middlename || !sexAssignedAtBirth || !lgbtqClassification) {
      // Delete uploaded files if present
      if (req.files?.idImageFront) fs.unlink(req.files.idImageFront[0].path, () => {});
      if (req.files?.idImageBack) fs.unlink(req.files.idImageBack[0].path, () => {});
      return res.status(400).json({ success: false, error: "All demographic fields are required." });
    }
    if (!req.files || !req.files.idImageFront || !req.files.idImageBack) {
      // Delete uploaded files if only one was uploaded
      if (req.files?.idImageFront) fs.unlink(req.files.idImageFront[0].path, () => {});
      if (req.files?.idImageBack) fs.unlink(req.files.idImageBack[0].path, () => {});
      return res.status(400).json({ success: false, error: "Both front and back ID images are required." });
    }

    // Compute age to store on the LGBTQProfile.
    // Priority: req.body.age -> req.user.birthday/dateOfBirth -> req.body.birthday/dateOfBirth -> req.user.age
    function computeAgeFrom(birthday) {
      if (!birthday) return null;
      try {
        const d = new Date(birthday);
        if (isNaN(d.getTime())) return null;
        const today = new Date();
        let a = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
        return a;
      } catch (e) {
        return null;
      }
    }

    let ageToSave = null;
    if (req.body && req.body.age) {
      const n = Number(req.body.age);
      if (!isNaN(n)) ageToSave = Math.floor(n);
    }
    if (ageToSave === null && req.user && (req.user.birthday || req.user.dateOfBirth)) {
      ageToSave = computeAgeFrom(req.user.birthday || req.user.dateOfBirth);
    }
    if (ageToSave === null && req.body && (req.body.birthday || req.body.dateOfBirth)) {
      ageToSave = computeAgeFrom(req.body.birthday || req.body.dateOfBirth);
    }
    if (ageToSave === null && req.user && req.user.age) {
      const n = Number(req.user.age);
      if (!isNaN(n)) ageToSave = Math.floor(n);
    }

    if (ageToSave === null) {
      // If age couldn't be determined, delete uploaded files and return an error
      if (req.files?.idImageFront) fs.unlink(req.files.idImageFront[0].path, () => {});
      if (req.files?.idImageBack) fs.unlink(req.files.idImageBack[0].path, () => {});
      return res.status(400).json({ success: false, error: "Age is required or could not be determined from birthday." });
    }

    const newProfile = new LGBTQProfile({
      user: userId,
      formCycle: formStatus.cycleId,
      lastname,
      firstname,
      middlename,
      age: ageToSave,
      sexAssignedAtBirth,
      lgbtqClassification,
      idImageFront: req.files.idImageFront[0].path, // Cloudinary URL
      idImageBack: req.files.idImageBack[0].path,   // Cloudinary URL
    });

    await newProfile.save();

    // Notify admins about the new submission
    await Notification.create({
      type: "lgbtq-profile",
      event: "newSubmission",
      message: `New LGBTQ Profile submission from user ${userId}`,
      referenceId: newProfile._id,
      cycleId: formStatus.cycleId,
      createdAt: new Date(),
      read: false,
    });

    // Notify real-time via Socket.io if available
    if (req.app.get("io")) {
      req.app.get("io").emit("lgbtq-profile:newSubmission", { id: newProfile._id });
    }

    // Populate user for birthday/age display (not saved in LGBTQProfile)
    const populatedProfile = await LGBTQProfile.findById(newProfile._id)
      .populate("user", "username email birthday age")
      .lean();

    return res.status(201).json({
      success: true,
      message: "LGBTQIA+ Profile submitted successfully",
      profile: {
        ...populatedProfile,
        birthday: populatedProfile.user?.birthday,
        age: populatedProfile.user?.age,
      },
    });
  } catch (error) {
    console.error("LGBTQ submit error:", error);
    return res.status(500).json({ success: false, error: "Server error while submitting form" });
  }
};

// Helper to enrich profile with KK info
const attachKKInfo = async (profile) => {
  // Always use user ID for query
  const userId = profile.user?._id || profile.user;
  const kk = await KKProfile.findOne({ user: userId });
  const profileObj = profile.toObject();
  profileObj.kkInfo = kk
    ? {
        lastname: kk.lastname,
        firstname: kk.firstname,
        middlename: kk.middlename,
        birthday: kk.birthday,
        age: kk.age,
        gender: kk.gender,
        region: kk.region,
        province: kk.province,
        municipality: kk.municipality,
        barangay: kk.barangay,
        purok: kk.purok,
      }
    : null;

  // Use fallback fields if kkInfo is null
  profileObj.displayData = kk
    ? {
        residentName: `${kk.firstname} ${kk.middlename ? kk.middlename + " " : ""}${kk.lastname}`.trim(),
        age: kk.age,
        purok: kk.purok,
        lgbtqClassification: profile.lgbtqClassification || "N/A",
      }
    : {
        residentName: `${profile.firstname || ""} ${profile.middlename ? profile.middlename + " " : ""}${profile.lastname || ""}`.trim() || "N/A",
        age: profile.age || "N/A",
        purok: profile.purok || "N/A",
        lgbtqClassification: profile.lgbtqClassification || "N/A",
      };

  return profileObj;
};

// Get all profiles (optionally filter by cycleId)
exports.getAllProfiles = async (req, res) => {
  try {
    const {
      year,
      cycle,
      all,
      sexAssignedAtBirth,
      lgbtqClassification,
      purok,
    } = req.query;

    let cycleDoc = null;
    let filter = {};

    if (all === "true") {
      if (sexAssignedAtBirth) filter.sexAssignedAtBirth = sexAssignedAtBirth;
      if (lgbtqClassification) filter.lgbtqClassification = lgbtqClassification;
    } else {
      if (year && cycle) {
        cycleDoc = await FormCycle.findOne({
          formName: "LGBTQIA+ Profiling",
          year: Number(year),
          cycleNumber: Number(cycle),
        });
        if (!cycleDoc) {
          return res.status(404).json({ error: "Specified cycle not found" });
        }
      } else {
        try {
          cycleDoc = await getPresentCycle("LGBTQIA+ Profiling");
        } catch (err) {
          return res.status(404).json({ error: err.message });
        }
      }
      filter.formCycle = cycleDoc._id;
      if (sexAssignedAtBirth) filter.sexAssignedAtBirth = sexAssignedAtBirth;
      if (lgbtqClassification) filter.lgbtqClassification = lgbtqClassification;
    }

    const profiles = await LGBTQProfile.find(filter)
      .populate("formCycle")
      .populate("user", "username email birthday age");

    // Enrich each profile with displayData
    const enriched = profiles.map(profile => {
      const demographics = {
        lastname: profile.lastname,
        firstname: profile.firstname,
        middlename: profile.middlename,
        birthday: profile.user?.birthday, // <-- reference user
        age: profile.user?.age,           // <-- reference user
        sexAssignedAtBirth: profile.sexAssignedAtBirth,
      };
      return {
        ...profile.toObject(),
        demographics,
        displayData: {
          residentName: `${demographics.firstname || ""} ${demographics.middlename ? demographics.middlename + " " : ""}${demographics.lastname || ""}`.trim() || "N/A",
          age: demographics.age || "N/A", // <-- from user
          lgbtqClassification: profile.lgbtqClassification || "N/A",
          sexAssignedAtBirth: profile.sexAssignedAtBirth || "N/A",
          birthday: demographics.birthday ? new Date(demographics.birthday).toISOString().split("T")[0] : "N/A",
          idImage: profile.idImage || null
        }
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get single profile by ID
exports.getProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id)
      .populate("user", "username email birthday age");
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Mark as read if admin and not already read
    if (req.user && req.user.role === "admin" && !profile.isRead) {
      profile.isRead = true;
      await profile.save();
      if (req.app.get("io")) {
        req.app.get("io").emit("lgbtq-profile:read", { id: profile._id });
      }
    }

    // ...existing code...
    const demographics = await getDemographics(profile);
    const displayData = {
      residentName: `${demographics.firstname || ""} ${demographics.middlename ? demographics.middlename + " " : ""}${demographics.lastname || ""}`.trim() || "N/A",
      age: demographics.age || "N/A", // from User
      lgbtqClassification: profile.lgbtqClassification || "N/A",
      sexAssignedAtBirth: profile.sexAssignedAtBirth || "N/A",
      birthday: demographics.birthday ? new Date(demographics.birthday).toISOString().split("T")[0] : "N/A", // from User
      idImage: profile.idImage || null
    };

    res.status(200).json({
      ...profile.toObject(),
      demographics,
      displayData,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get my profile for current cycle
exports.getMyProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",
    });

    if (
      !formStatus ||
      !formStatus.cycleId ||
      !mongoose.Types.ObjectId.isValid(formStatus.cycleId)
    ) {
      return res.status(404).json({ error: "No active cycle found." });
    }

    // Populate all needed user fields
    const profile = await LGBTQProfile.findOne({
      user: req.user.id,
      formCycle: formStatus.cycleId,
      isDeleted: false
    }).populate("user", "username email birthday age");

    if (!profile)
      return res.status(404).json({ error: "No profile found for this cycle" });

    // Defensive: ensure .toObject exists
    const enriched = await attachKKInfo(profile);
    // Also include demographics (birthday, age) from populated user for convenience
    try {
      const demographics = await getDemographics(profile);
      enriched.demographics = demographics;
      // expose top-level birthday & age for callers that expect them
      if (demographics && demographics.birthday) enriched.birthday = demographics.birthday;
      if (demographics && demographics.age !== undefined) enriched.age = demographics.age;
    } catch (e) {
      console.warn('Failed to attach demographics to enriched profile', e);
    }
    res.status(200).json(enriched);
  } catch (error) {
    console.error("getMyProfile error:", error); // <-- Add this for debugging
    res.status(500).json({ error: "Server error" });
  }
};

// Update a profile
exports.updateProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    if (profile.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Not authorized to update this profile" });
    }

    if (req.body.sexAssignedAtBirth)
      profile.sexAssignedAtBirth = req.body.sexAssignedAtBirth;
    if (req.body.lgbtqClassification)
      profile.lgbtqClassification = req.body.lgbtqClassification;
    if (req.file) profile.idImage = req.file.filename; // <-- use filename

    await profile.save();
    res.json({ message: "Profile updated", profile });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Update my own profile (user-level) — accepts multipart for idImageFront/idImageBack
exports.updateMyProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });

    const profile = await LGBTQProfile.findOne({ user: req.user.id, isDeleted: false });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Update simple fields if provided
    const updatable = ['lastname', 'firstname', 'middlename', 'sexAssignedAtBirth', 'lgbtqClassification'];
    updatable.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(req.body, k) && req.body[k] !== undefined) {
        profile[k] = req.body[k];
      }
    });

    // Helper to extract Cloudinary public_id from stored url
    function extractPublicId(url) {
      try {
        if (!url || typeof url !== 'string') return null;
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;
        let after = parts[1];
        // remove version prefix if present (v1234567/)
        after = after.replace(/^v\d+\//, '');
        // remove extension
        after = after.replace(/\.[a-zA-Z0-9]+$/, '');
        return after;
      } catch (e) {
        return null;
      }
    }

    // Handle _removed flag (may be JSON string or object)
    if (req.body && req.body._removed) {
      let removed = req.body._removed;
      if (typeof removed === 'string') {
        try { removed = JSON.parse(removed); } catch (e) { /* keep string */ }
      }
      if (removed && (removed.front || removed.idImageFront)) {
        // delete existing cloudinary resource if present
        if (profile.idImageFront) {
          const pid = extractPublicId(profile.idImageFront);
          if (pid) {
            try { await cloudinary.uploader.destroy(pid); } catch (e) { console.warn('Cloudinary destroy front failed', e); }
          }
        }
        profile.idImageFront = null;
      }
      if (removed && (removed.back || removed.idImageBack)) {
        if (profile.idImageBack) {
          const pid = extractPublicId(profile.idImageBack);
          if (pid) {
            try { await cloudinary.uploader.destroy(pid); } catch (e) { console.warn('Cloudinary destroy back failed', e); }
          }
        }
        profile.idImageBack = null;
      }
    }

    // If new files uploaded, replace stored paths
    if (req.files && req.files.idImageFront && req.files.idImageFront[0]) {
      // delete old image first if exists
      if (profile.idImageFront) {
        const oldPid = extractPublicId(profile.idImageFront);
        if (oldPid) {
          try { await cloudinary.uploader.destroy(oldPid); } catch (e) { console.warn('Cloudinary destroy old front failed', e); }
        }
      }
      profile.idImageFront = req.files.idImageFront[0].path;
    }
    if (req.files && req.files.idImageBack && req.files.idImageBack[0]) {
      if (profile.idImageBack) {
        const oldPid = extractPublicId(profile.idImageBack);
        if (oldPid) {
          try { await cloudinary.uploader.destroy(oldPid); } catch (e) { console.warn('Cloudinary destroy old back failed', e); }
        }
      }
      profile.idImageBack = req.files.idImageBack[0].path;
    }

    await profile.save();
    return res.json({ message: 'Profile updated', profile });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Delete a profile
exports.deleteProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id).populate("user");
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    profile.isDeleted = true;
    profile.deletedAt = new Date();
    await profile.save();

    // Remove related notifications
    await Notification.deleteMany({ referenceId: profile._id });
    if (req.app.get("io")) {
      req.app.get("io").emit("lgbtq-profile:deleted", { id: profile._id });
    }

    // Send announcement to the user
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    await Announcement.create({
      title: "LGBTQ Profiling Form Deleted",
      content: `The admin has observed that your LGBTQ Profiling form has inaccuracies. As a result, your LGBTQ Profiling form for this cycle has been deleted and moved to the recycle bin. You may submit a new form if the cycle is still open, please make sure all information is accurate.`,
      category: "LGBTQ Profiling",
      eventDate: new Date(),
      expiresAt,
      createdBy: req.user.id,
      recipient: profile.user._id, // <-- set recipient
      isPinned: false,
      isActive: true,
      viewedBy: [],
    });

    res.json({ message: "Profile moved to recycle bin" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Restore a deleted profile
exports.restoreProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id).populate("user");
    if (!profile || !profile.isDeleted) {
      return res.status(404).json({ error: "Profile not found or not deleted" });
    }

    // Check for duplicate (non-deleted) profile for the same user and cycle
    const duplicate = await LGBTQProfile.findOne({
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
      title: "LGBTQ Profiling Form Restored",
      content: `Your LGBTQ Profiling form for this cycle has been restored.`,
      category: "LGBTQ Profiling",
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

// Permanently delete a profile
exports.permanentlyDeleteProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id);
    if (!profile || !profile.isDeleted) return res.status(404).json({ error: "Profile not found or not deleted" });

    await profile.deleteOne();
    res.json({ message: "Profile permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Export profiles (optionally filter by cycleId)
exports.exportProfilesToExcel = async (req, res) => {
  try {
    const templatePath = path.resolve(__dirname, '../templates/lgbtq_profiling_template.xlsx');
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
        formName: "LGBTQIA+ Profiling",
        year: Number(year),
        cycleNumber: Number(cycle),
      });

      if (!formCycle) {
        return res.status(404).json({ error: `No cycle found for year ${year} and cycle ${cycle}` });
      }
    } else {
      // Fetch the present (open) cycle
      formCycle = await FormCycle.findOne({ formName: "LGBTQIA+ Profiling", isOpen: true });
      if (!formCycle) {
        return res.status(404).json({ error: 'No open cycle found' });
      }
    }

    // Fetch LGBTQ Profiles for the selected cycle and sort by createdAt (descending)
    let profiles = await LGBTQProfile.find({ formCycle: formCycle._id, isDeleted: false })
      .populate("user", "birthday")
      .sort({ createdAt: -1 }); // Sort by createdAt in descending order

    if (!profiles.length) {
      return res.status(404).json({ error: 'No LGBTQ Profiles found for the selected cycle' });
    }

    // Start writing data at row 4 (since rows 1-3 are headers)
    let rowNum = 4;

    profiles.forEach(profile => {
      const fullName = `${(profile.lastname || '').toUpperCase()}, ${(profile.firstname || '').toUpperCase()} ${(profile.middlename || '').toUpperCase()}${profile.suffix ? ` ${profile.suffix.toUpperCase()}` : ''}`.trim();

      // Prefer stored age in DB; otherwise extract birthday details and compute age
      const storedAge = (typeof profile.age !== 'undefined' && profile.age !== null) ? Number(profile.age) : null;
      const birthday = profile.user?.birthday ? new Date(profile.user.birthday) : null;
      const birthMonth = birthday ? birthday.getMonth() + 1 : "N/A"; // Months are 0-indexed
      const birthDay = birthday ? birthday.getDate() : "N/A";
      const birthYear = birthday ? birthday.getFullYear() : "N/A";

      // Compute age dynamically only if not stored on profile
      const today = new Date();
      const computedAge = birthday
        ? today.getFullYear() - birthYear - (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay) ? 1 : 0)
        : "N/A";
      const age = (storedAge !== null && !isNaN(storedAge)) ? storedAge : computedAge;

      // Sex Assigned at Birth
      const sexAssignedAtBirth = profile.sexAssignedAtBirth || "N/A";

      // LGBTQ Classification
      const lgbtqClassification = profile.lgbtqClassification || "N/A";

      // Write data to the existing row
      worksheet.getCell(`A${rowNum}`).value = fullName;              // Full Name
      worksheet.getCell(`B${rowNum}`).value = age;                  // Age
      worksheet.getCell(`C${rowNum}`).value = birthMonth;           // Birth Month
      worksheet.getCell(`D${rowNum}`).value = birthDay;             // Birth Day
      worksheet.getCell(`E${rowNum}`).value = birthYear;            // Birth Year
      worksheet.getCell(`F${rowNum}`).value = sexAssignedAtBirth;   // Sex Assigned at Birth
      worksheet.getCell(`G${rowNum}`).value = lgbtqClassification;  // LGBTQ Classification

      rowNum++; // Move to the next row
    });

    // Set headers for the response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=lgbtq_profiling_export_${year || 'present'}_cycle_${cycle || 'open'}.xlsx`);

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Failed to export LGBTQ Profiling data' });
  }
};

// Filter profiles by cycle number and year
// Filter profiles by cycle number and year
exports.filterProfilesByCycle = async (req, res) => {
  try {
    const { cycleNumber, year } = req.query;

    // Validate inputs
    if (!cycleNumber || !year) {
      return res
        .status(400)
        .json({ error: "cycleNumber and year are required" });
    }

    // Find the cycle for LGBTQIA+ Profiling
    const cycle = await FormCycle.findOne({
      formName: "LGBTQIA+ Profiling",
      cycleNumber: Number(cycleNumber),
      year: Number(year),
    });

    if (!cycle) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    // Find all profiles that match the cycle
    const profiles = await LGBTQProfile.find({ formCycle: cycle._id }).populate(
      "user",
      "username email"
    );

    // Enrich with KK Info
    const enriched = await Promise.all(profiles.map(attachKKInfo));

    res.status(200).json(enriched);
  } catch (error) {
    console.error("Error filtering profiles by cycle:", error);
    res.status(500).json({ error: "Server error while filtering profiles" });
  }
};

async function getPresentCycle(formName) {
  const status = await FormStatus.findOne({ formName, isOpen: true }).populate(
    "cycleId"
  );
  if (!status || !status.cycleId) {
    throw new Error("No active form cycle");
  }
  return status.cycleId;
}

// Get deleted profiles
exports.getDeletedProfiles = async (req, res) => {
  try {
    console.log("GET /api/lgbtqprofiling/deleted called");
    // Check if request is authenticated and authorized
    console.log("User:", req.user);
    // Query for deleted profiles
    const profiles = await LGBTQProfile.find({ isDeleted: true });
    console.log("Deleted profiles found:", profiles.length);
    res.json(profiles);
  } catch (err) {
    console.error("Error in getDeletedProfiles:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};
