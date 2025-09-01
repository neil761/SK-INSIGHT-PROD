const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const KKProfile = require("../models/KKProfile");
const LGBTQProfile = require("../models/LGBTQProfile");
const ExcelJS = require("exceljs");

// Helper to get demographics from KKProfile or fallback
async function getDemographics(profile) {
  if (profile.kkProfileId) {
    const kk = await KKProfile.findById(profile.kkProfileId).lean();
    if (kk) {
      return {
        lastname: kk.lastname,
        firstname: kk.firstname,
        middlename: kk.middlename,
        birthday: kk.birthday,
        age: kk.age,
        address: kk.address,
        gender: kk.gender,
        region: kk.region,
        province: kk.province,
        municipality: kk.municipality,
        barangay: kk.barangay,
        purok: kk.purok,
      };
    }
  }
  // Fallback to fields in LGBTQProfile
  return {
    lastname: profile.lastname,
    firstname: profile.firstname,
    middlename: profile.middlename,
    birthday: profile.birthday,
    age: profile.age,
    address: profile.address,
    gender: profile.gender,
    region: profile.region,
    province: profile.province,
    municipality: profile.municipality,
    barangay: profile.barangay,
    purok: profile.purok,
  };
}

// Submit new profile
exports.submitLGBTQProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const formStatus = await FormStatus.findOne({
      formName: "LGBTQIA+ Profiling",
    });
    if (!formStatus || !formStatus.isOpen) {
      return res.status(403).json({ error: "Form is currently closed" });
    }

    const existing = await LGBTQProfile.findOne({
      user: userId,
      formCycle: formStatus.cycleId,
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "You already submitted during this form cycle" });
    }

    // Get all possible fields
    const {
      kkProfileId,
      lastname,
      firstname,
      middlename,
      birthday,
      age,
      address,
      gender,
      region,
      province,
      municipality,
      barangay,
      purok,
      sexAssignedAtBirth,
      lgbtqClassification,
    } = req.body;
    const idImage = req.file ? req.file.path : undefined;

    // --- NEW VALIDATION LOGIC ---
    let kkProfileDoc = null;
    if (kkProfileId) {
      kkProfileDoc = await KKProfile.findById(kkProfileId).lean();
      // Ensure KKProfile belongs to the submitting user
      if (kkProfileDoc && kkProfileDoc.user.toString() !== userId) {
        return res.status(400).json({
          error: "The provided KK Profile does not belong to your account.",
        });
      }
    }
    const kkProfileExists = !!kkProfileDoc;

    // Require fallback fields if no valid KKProfile
    if (!kkProfileExists) {
      if (
        !lastname ||
        !firstname ||
        !middlename ||
        !birthday ||
        !age ||
        !purok // <-- add this line
      ) {
        return res.status(400).json({
          error:
            "Demographic fields (lastname, firstname, middlename, birthday, age, purok) are required if KK Profile does not exist.",
        });
      }
    }

    const newProfile = new LGBTQProfile({
      user: userId,
      formCycle: formStatus.cycleId,
      kkProfileId: kkProfileExists ? kkProfileId : undefined,
      lastname,
      firstname,
      middlename,
      birthday,
      age,
      address,
      gender,
      region,
      province,
      municipality,
      barangay,
      purok,
      sexAssignedAtBirth,
      lgbtqClassification,
      idImage,
    });

    await newProfile.save();

    // Fetch the saved profile and attach demographics and full KKProfile
    const savedProfile = await LGBTQProfile.findById(newProfile._id).lean();
    const demographics = kkProfileExists
      ? {
          lastname: kkProfileDoc.lastname,
          firstname: kkProfileDoc.firstname,
          middlename: kkProfileDoc.middlename,
          birthday: kkProfileDoc.birthday,
          age: kkProfileDoc.age,
          address: kkProfileDoc.address,
          gender: kkProfileDoc.gender,
          region: kkProfileDoc.region,
          province: kkProfileDoc.province,
          municipality: kkProfileDoc.municipality,
          barangay: kkProfileDoc.barangay,
          purok: kkProfileDoc.purok,
        }
      : {
          lastname: savedProfile.lastname,
          firstname: savedProfile.firstname,
          middlename: savedProfile.middlename,
          birthday: savedProfile.birthday,
          age: savedProfile.age,
          address: savedProfile.address,
          gender: savedProfile.gender,
          region: savedProfile.region,
          province: savedProfile.province,
          municipality: savedProfile.municipality,
          barangay: savedProfile.barangay,
          purok: savedProfile.purok,
        };

    res.status(201).json({
      message: "LGBTQIA+ Profile submitted successfully",
      profile: {
        ...savedProfile,
        demographics,
        kkProfile: kkProfileDoc || null,
      },
    });
  } catch (error) {
    console.error("LGBTQ submit error:", error);
    res.status(500).json({ error: "Server error while submitting form" });
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

      const profiles = await LGBTQProfile.find(filter)
        .populate("formCycle")
        .populate("user", "username email");

      const enriched = await Promise.all(profiles.map(attachKKInfo));

      // If purok filter is passed
      const final = purok
        ? enriched.filter((p) => p.kkInfo && p.kkInfo.purok === purok)
        : enriched;

      return res.json(final);
    }

    // Year & cycle specified
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

    const profiles = await LGBTQProfile.find(filter)
      .populate("formCycle")
      .populate("user", "username email");

    const enriched = await Promise.all(profiles.map(attachKKInfo));

    const final = purok
      ? enriched.filter((p) => p.kkInfo && p.kkInfo.purok === purok)
      : enriched;

    res.json(final);
  } catch (err) {
    console.error("getAllProfiles error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single profile by ID
exports.getProfileById = async (req, res) => {
  try {
    const profile = await LGBTQProfile.findById(req.params.id).populate(
      "user",
      "username email"
    );
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const demographics = await getDemographics(profile);

    // Merge demographics for response
    const enriched = {
      ...profile.toObject(),
      demographics,
      // Keep your displayData logic if needed
      displayData: {
        residentName: `${demographics.firstname || ""} ${demographics.middlename ? demographics.middlename + " " : ""}${demographics.lastname || ""}`.trim(),
        age: demographics.age || "N/A",
        purok: demographics.purok || "N/A",
        lgbtqClassification: profile.lgbtqClassification || "N/A",
      },
    };

    res.status(200).json(enriched);
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
    if (req.file) profile.idImage = req.file.path;

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
      { header: "Gender", key: "gender" },
    ];

    for (const profile of profiles) {
      const kk = await KKProfile.findOne({ user: profile.user._id });
      sheet.addRow({
        username: profile.user.username,
        email: profile.user.email,
        cycleId: profile.formCycle, // FIXED
        sexAssignedAtBirth: profile.sexAssignedAtBirth,
        lgbtqClassification: profile.lgbtqClassification,
        lastname: kk?.lastname,
        firstname: kk?.firstname,
        age: kk?.age,
        gender: kk?.gender,
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
