const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/lgbtq_id_images"); // <-- new folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadLGBTQIdImage = multer({ storage });

module.exports = uploadLGBTQIdImage;