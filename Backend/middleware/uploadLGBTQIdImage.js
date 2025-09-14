const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/lgbtq_id_images"));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + file.originalname;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  console.log("Checking file:", file.originalname, file.mimetype);
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed!'), false);
  } else {
    cb(null, true);
  }
};

const upload = multer({ storage: storage, fileFilter });
console.log("uploadLGBTQIdImage middleware hit");
module.exports = upload;