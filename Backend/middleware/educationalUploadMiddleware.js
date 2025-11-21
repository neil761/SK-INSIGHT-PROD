const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

// File filter to validate file type and size
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ["image/jpeg", "image/png"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes

  // Validate file type
  if (!allowedFileTypes.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Only JPG and PNG files are allowed.")
    );
  }

  // Validate file size
  if (file.size > maxFileSize) {
    return cb(new Error("File size exceeds the maximum limit of 10MB."));
  }

  cb(null, true); // Accept the file
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = "educational_assistance";

    if (file.fieldname === "frontImage") {
      folder = "educational_assistance/id/front";
    } else if (file.fieldname === "backImage") {
      folder = "educational_assistance/id/back";
    } else if (file.fieldname === "coeImage") {
      folder = "educational_assistance/coe";
    } else if (file.fieldname === "voter") {
      folder = "educational_assistance/parent_voter_cert";
    }

    return {
      folder,
      allowed_formats: ["jpg", "png"],
      public_id: `${Date.now()}-${file.originalname
        .replace(/\s+/g, "_")
        .replace(/\.[^/.]+$/, "")}`,
    };
  },
});

const uploadEducational = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

module.exports = uploadEducational;
