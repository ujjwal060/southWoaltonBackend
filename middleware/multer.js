
const multer = require('multer');
const { S3 } = require('@aws-sdk/client-s3');
const path = require('path');
const { getConfig } = require('../config');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|pdf|txt|doc|docx/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (mimeType && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG,pdf, txt,doc,docx,and PNG images are allowed.'));
    }
  },
  limits: { fileSize: 1024 * 1024 * 10 },
});

module.exports = upload;
