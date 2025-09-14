const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const KKProfile = require("../models/KKProfile");
const LGBTQProfile = require("../models/LGBTQProfile");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

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
  console.log('submitLGBTQProfile controller reached');
  try {
    const userId = req.user.id;
    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",
    });

    // --- FORM CLOSED ---
    if (!formStatus || !formStatus.isOpen) {
      if (req.file) {
        console.log('[LGBTQ] Deleting uploaded file due to closed form:', req.file.path);
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("[LGBTQ] Failed to delete file:", err);
          else console.log("[LGBTQ] File deleted:", req.file.path);
        });
      }
      return res.status(403).json({ success: false, error: "Form is currently closed" });
    }

    // --- ALREADY SUBMITTED ---
    const existing = await LGBTQProfile.findOne({
      user: userId,
      formCycle: formStatus.cycleId,
    });
    if (existing) {
      if (req.file) {
        console.log('[LGBTQ] Deleting uploaded file due to duplicate submission:', req.file.path);
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("[LGBTQ] Failed to delete file:", err);
          else console.log("[LGBTQ] File deleted:", req.file.path);
        });
      }
      return res.status(409).json({
        success: false,
        error: "You already submitted during this form cycle"
      });
    }

    // --- MISSING IMAGE ---
    const idImage = req.file ? req.file.filename : undefined;
    if (!idImage) {
      return res.status(400).json({
        success: false,
        error: "ID image is required."
      });
    }

    // --- MISSING DEMOGRAPHICS ---
    const { lastname, firstname, middlename, sexAssignedAtBirth, lgbtqClassification } = req.body;
    if (!lastname || !firstname || !middlename) {
      if (req.file) {
        console.log('[LGBTQ] Deleting uploaded file due to missing demographics:', req.file.path);
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("[LGBTQ] Failed to delete file:", err);
          else console.log("[LGBTQ] File deleted:", req.file.path);
        });
      }
      return res.status(400).json({
        success: false,
        error: "Demographic fields (lastname, firstname, middlename) are required."
      });
    }

    const newProfile = new LGBTQProfile({
      user: userId,
      formCycle: formStatus.cycleId,
      lastname,
      firstname,
      middlename,
      sexAssignedAtBirth,
      lgbtqClassification,
      idImage,
    });

    await newProfile.save();

    // Fetch the saved profile and attach demographics
    const savedProfile = await LGBTQProfile.findById(newProfile._id).lean();
    const demographics = await getDemographics(savedProfile);

    return res.status(201).json({
      success: true,
      message: "LGBTQIA+ Profile submitted successfully",
      profile: {
        ...savedProfile,
        demographics,
      },
    });
  } catch (error) {
    console.error("LGBTQ submit error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while submitting form"
    });
  }
};

// Helper to enrich profile with KK info
const attachKKInfo = async (profile) => {
  const kk = await KKProfile.findOne({ user: profile.user });
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
    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",
    });
    const profile = await LGBTQProfile.findOne({
      user: req.user.id,
      formCycle: formStatus?.cycleId, // FIXED
    }).populate("user", "username email");

    if (!profile)
      return res.status(404).json({ error: "No profile found for this cycle" });
    const enriched = await attachKKInfo(profile);
    res.status(200).json(enriched);
  } catch (error) {
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

// Delete a profile
exports.deleteProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Delete the ID image file if it exists
    if (profile.idImage) {
      const imagePath = path.join(__dirname, "../uploads/lgbtq_id_images", profile.idImage);
      fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(imagePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error("Error deleting ID image:", unlinkErr);
            }
          });
        }
      });
    }

    await profile.deleteOne();
    res.json({ message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Export profiles (optionally filter by cycleId)
exports.exportProfilesToExcel = async (req, res) => {
  try {
    const { cycleId } = req.query;
    const query = cycleId ? { formCycle: cycleId } : {}; // FIXED
    const profiles = await LGBTQProfile.find(query).populate(
      "user",
      "username email"
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("LGBTQIA+ Profiling");

    sheet.columns = [
      { header: "User", key: "username" },
      { header: "Email", key: "email" },
      { header: "Cycle ID", key: "cycleId" },
      { header: "Sex Assigned at Birth", key: "sexAssignedAtBirth" },
      { header: "LGBTQ Classification", key: "lgbtqClassification" },
      { header: "Lastname", key: "lastname" },
      { header: "Firstname", key: "firstname" },
      { header: "Age", key: "age" },
      // REMOVED address, region, province, municipality, barangay, purok
    ];

    for (const profile of profiles) {
      sheet.addRow({
        username: profile.user.username,
        email: profile.user.email,
        cycleId: profile.formCycle,
        sexAssignedAtBirth: profile.sexAssignedAtBirth,
        lgbtqClassification: profile.lgbtqClassification,
        lastname: profile.lastname,
        firstname: profile.firstname,
        age: profile.user?.age, // <-- from user
        // REMOVED address, region, province, municipality, barangay, purok
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=lgbtq_profiles.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: "Failed to export to Excel" });
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
