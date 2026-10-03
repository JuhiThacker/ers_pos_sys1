const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `avatar-${req.user.userId}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, GIF or WEBP images are allowed.'));
  },
}).single('image');

// Use AFTER authentication so req.user is available for the file name
const handleImageUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller.' : err.message;
      return res.status(400).json({ error: msg });
    }
    next();
  });
};

module.exports = { handleImageUpload, UPLOAD_DIR };