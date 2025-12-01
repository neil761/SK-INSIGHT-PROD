const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinaryConfig');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'lgbtq_id_images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => Date.now() + '-' + file.originalname.replace(/\s+/g, '_'),
  },
});

const uploadLGBTQIdImage = multer({ storage });
// Diagnostic: log when multer/cloudinary middleware is invoked
module.exports = (...args) => {
  console.log('==> uploadLGBTQIdImage middleware invoked');
  return uploadLGBTQIdImage(...args);
};

module.exports = uploadLGBTQIdImage;