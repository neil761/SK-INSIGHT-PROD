const mongoose = require('mongoose');

const formStatusSchema = new mongoose.Schema({
  formName: { type: String, required: true, unique: true },
  isOpen: { type: Boolean, default: true },
  cycleId: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
});

module.exports = mongoose.model('FormStatus', formStatusSchema);
