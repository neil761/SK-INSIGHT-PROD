const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile_images');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
    return cb(new Error("Only JPG/PNG files allowed"), false);
  }
  cb(null, true);
}

module.exports = multer({ storage, fileFilter });
