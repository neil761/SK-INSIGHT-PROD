const multer = require("multer");
const path = require("path");

function fileFilter(req, file, cb) {
  if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
    return cb(new Error("Only JPG/PNG files allowed"), false);
  }
  cb(null, true);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/signatures/");
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + file.originalname;
    cb(null, unique);
  },
});

const upload = multer({ storage: storage, fileFilter: fileFilter });
module.exports = upload;
