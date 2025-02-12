const multer = require('multer');
const path = require('path');
//const multerS3 = require('multer-s3');
//const S3Client = require('@aws-sdk/client-s3');

const config = require('./config');

let storage;

if (config.env === 'development') {
  // Local storage for development
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Get the tenantId from the request user (assuming it's in req.user.tenantID)
      const tenantId = req.user.tenantID;
      // Create a folder for the tenant if it doesn't exist
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
} else {
  // Cloud storage for production (DigitalOcean Spaces - S3 compatible)
  const s3 = new S3Client({
    region: process.env.DIGITALOCEAN_REGION,
    endpoint: `https://${process.env.DIGITALOCEAN_REGION}.digitaloceanspaces.com`,
    credentials: {
      accessKeyId: process.env.DIGITALOCEAN_ACCESS_KEY_ID,
      secretAccessKey: process.env.DIGITALOCEAN_SECRET_ACCESS_KEY,
    },
  });

  storage = multerS3({
    s3,
    bucket: process.env.DIGITALOCEAN_SPACE_NAME,
    acl: 'public-read', // Set permissions for the uploaded file
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, `business-logos/${Date.now()}-${file.originalname}`);
    },
  });
}

const upload = multer({ storage });

module.exports = {
  upload,
};
