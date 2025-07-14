const mongoose = require('mongoose');

const kkProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cycleId: String,

  lastname: String,
  firstname: String,
  middlename: String,
  suffix: String,
  gender: String,
  age: Number,
  birthday: Date,

  region: String,
  province: String,
  municipality: String,
  barangay: String,
  purok: String,

  email: String,
  contactNumber: String,

  civilStatus: String,
  youthAgeGroup: String,
  youthClassification: String,
  educationalBackground: String,
  workStatus: String,

  registeredSKVoter: Boolean,
  registeredNationalVoter: Boolean,
  votedLastSKElection: Boolean,

  attendedKKAssembly: Boolean,
  attendanceCount: {
    type: String,
    enum: ['1-2 times', '3-4 times', '5 and above'],
  },
  reasonDidNotAttend: {
    type: String,
    enum: ['there was no kk assembly', 'not interested'],
  },
  profileImage: { type: String, required: false }, 

  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('KKProfile', kkProfileSchema);
