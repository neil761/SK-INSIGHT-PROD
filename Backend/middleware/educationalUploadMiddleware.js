const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinaryConfig");

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = "educational_assistance";
    if (file.fieldname === "frontImage") folder = "educational_assistance/id/front";
    else if (file.fieldname === "backImage") folder = "educational_assistance/id/back";
    else if (file.fieldname === "coeImage") folder = "educational_assistance/coe";
    else if (file.fieldname === "voter") folder = "educational_assistance/parent_voter_cert";

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      public_id: `${Date.now()}-${file.originalname
        .replace(/\s+/g, "_")
        .replace(/\.[^/.]+$/, "")}`,
    };
  },
});

const uploadEducational = multer({ storage });

module.exports = uploadEducational;
