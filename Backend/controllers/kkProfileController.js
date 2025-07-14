const KKProfile = require('../models/KKProfile');
const FormStatus = require('../models/FormStatus');
const ExcelJS = require('exceljs');

// POST /api/kkprofiling
exports.submitKKProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const formStatus = await FormStatus.findOne({ formName: 'KK Profiling' });
    if (!formStatus || !formStatus.isOpen) {
      return res.status(403).json({ error: 'Form is currently closed' });
    }

    const existing = await KKProfile.findOne({ user: userId, cycleId: formStatus.cycleId });
    if (existing) {
      return res.status(409).json({ error: 'You already submitted during this form cycle' });
    }

    const {
      lastname, firstname, middlename, suffix, gender, age, birthday,
      region, province, municipality, barangay, purok,
      email, contactNumber, civilStatus,
      youthAgeGroup, youthClassification, educationalBackground, workStatus,
      registeredSKVoter, registeredNationalVoter, votedLastSKElection,
      attendedKKAssembly, attendanceCount, reasonDidNotAttend,
    } = req.body;

    if (attendedKKAssembly === true && !attendanceCount) {
      return res.status(400).json({ error: 'Attendance count is required' });
    }

    if (attendedKKAssembly === false && !reasonDidNotAttend) {
      return res.status(400).json({ error: 'Reason for not attending is required' });
    }

    const newProfile = new KKProfile({
      user: userId,
      cycleId: formStatus.cycleId,
      lastname, firstname, middlename, suffix, gender, age, birthday,
      region, province, municipality, barangay, purok,
      email, contactNumber, civilStatus,
      youthAgeGroup, youthClassification, educationalBackground, workStatus,
      registeredSKVoter, registeredNationalVoter, votedLastSKElection,
      attendedKKAssembly,
      attendanceCount: attendedKKAssembly ? attendanceCount : undefined,
      reasonDidNotAttend: !attendedKKAssembly ? reasonDidNotAttend : undefined,
      profileImage: req.file ? req.file.path : undefined // ✅ NEW
    });

    await newProfile.save();
    res.status(201).json({ message: 'Profile submitted successfully' });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Server error while submitting form' });
  }
};


// GET /api/kkprofiling (admin)
exports.getAllProfiles = async (req, res) => {
  try {
    const profiles = await KKProfile.find().populate('user', 'username email');
    res.status(200).json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
};

// GET /api/kkprofiling/:id (admin)
exports.getProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id).populate('user', 'username email');
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/kkprofiling/:id (admin or owner)
exports.updateProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    if (profile.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    Object.assign(profile, req.body);
    await profile.save();
    res.json({ message: 'Profile updated', profile });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/kkprofiling/:id (admin only)
exports.deleteProfileById = async (req, res) => {
  try {
    const profile = await KKProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    await profile.deleteOne();
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/kkprofiling/export (admin)
// controllers/kkProfileController.js

exports.exportProfilesToExcel = async (req, res) => {
  try {
    const profiles = await KKProfile.find().populate('user', 'username email');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('KK Profiling');

    // Define all columns based on your model
    sheet.columns = [
      { header: 'User ID', key: 'userId', width: 24 },
      { header: 'Lastname', key: 'lastname', width: 15 },
      { header: 'Firstname', key: 'firstname', width: 15 },
      { header: 'Middlename', key: 'middlename', width: 15 },
      { header: 'Suffix', key: 'suffix', width: 10 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Age', key: 'age', width: 6 },
      { header: 'Birthday', key: 'birthday', width: 12 },
      { header: 'Region', key: 'region', width: 15 },
      { header: 'Province', key: 'province', width: 15 },
      { header: 'Municipality', key: 'municipality', width: 15 },
      { header: 'Barangay', key: 'barangay', width: 15 },
      { header: 'Purok', key: 'purok', width: 10 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Contact Number', key: 'contactNumber', width: 15 },
      { header: 'Civil Status', key: 'civilStatus', width: 15 },
      { header: 'Youth Age Group', key: 'youthAgeGroup', width: 15 },
      { header: 'Youth Classification', key: 'youthClassification', width: 18 },
      { header: 'Educational Background', key: 'educationalBackground', width: 20 },
      { header: 'Work Status', key: 'workStatus', width: 15 },
      { header: 'Registered SK Voter', key: 'registeredSKVoter', width: 15 },
      { header: 'Registered National Voter', key: 'registeredNationalVoter', width: 20 },
      { header: 'Voted Last SK Election', key: 'votedLastSKElection', width: 20 },
      { header: 'Attended KK Assembly', key: 'attendedKKAssembly', width: 20 },
      { header: 'Attendance Count', key: 'attendanceCount', width: 18 },
      { header: 'Reason Did Not Attend', key: 'reasonDidNotAttend', width: 25 },
      { header: 'Submitted At', key: 'createdAt', width: 22 },
    ];

    // Add rows
    profiles.forEach((profile) => {
      sheet.addRow({
        userId: profile.user?._id?.toString() || '',
        lastname: profile.lastname,
        firstname: profile.firstname,
        middlename: profile.middlename,
        suffix: profile.suffix,
        gender: profile.gender,
        age: profile.age,
        birthday: profile.birthday,
        region: profile.region,
        province: profile.province,
        municipality: profile.municipality,
        barangay: profile.barangay,
        purok: profile.purok,
        email: profile.email,
        contactNumber: profile.contactNumber,
        civilStatus: profile.civilStatus,
        youthAgeGroup: profile.youthAgeGroup,
        youthClassification: profile.youthClassification,
        educationalBackground: profile.educationalBackground,
        workStatus: profile.workStatus,
        registeredSKVoter: profile.registeredSKVoter,
        registeredNationalVoter: profile.registeredNationalVoter,
        votedLastSKElection: profile.votedLastSKElection,
        attendedKKAssembly: profile.attendedKKAssembly,
        attendanceCount: profile.attendanceCount,
        reasonDidNotAttend: profile.reasonDidNotAttend,
        createdAt: profile.createdAt,
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=kk_profiles_full.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export to Excel' });
  }
};



// GET /api/kkprofiling/me
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Optional: get current form cycle to show only this cycle's response
    const formStatus = await FormStatus.findOne({ formName: 'KK Profiling' });

    const profile = await KKProfile.findOne({
      user: userId,
      cycleId: formStatus?.cycleId || 1
    });

    if (!profile) {
      return res.status(404).json({ error: 'You have not submitted a KK profile yet for the current cycle.' });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getProfileImage = async (req, res) => {
  try {
    const profile = await KKProfile.findOne({ user: req.user.id });
    if (!profile || !profile.profileImage) {
      return res.status(404).json({ error: 'No image found' });
    }

    res.status(200).json({ imageUrl: `${req.protocol}://${req.get('host')}/${profile.profileImage}` });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching image' });
  }
};
