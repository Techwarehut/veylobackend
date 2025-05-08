const multer = require('multer');
const path = require('path');
const fs = require('fs');
//const multerS3 = require('multer-s3');
//const S3Client = require('@aws-sdk/client-s3');

const config = require('../config/config');

let storage;

// Local storage for development

storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get the tenantId from the request user (assuming it's in req.user.tenantID)
    const tenantId = req.user.tenantID.toString();

    if (!tenantId) {
      return cb(new Error('Tenant ID is missing'), null);
    }

    /*  let uploadDir;
    if (config.env === 'development') {
      // Create a folder for the tenant if it doesn't exist
      uploadDir = path.join(__dirname, '..', 'uploads', tenantId);
    } else {
      // For production, use the mounted volume path
      uploadDir = path.join('/mnt/volume_tor1_01/app/uploads', tenantId);
    } */
    const uploadDir = path.join(__dirname, '..', 'uploads', tenantId);

    // Ensure that the directory exists or create it
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir); // Local uploads folder
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    //const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;  // Unique filename

    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

module.exports = upload;
