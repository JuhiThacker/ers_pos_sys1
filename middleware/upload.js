const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Folder for employee profile images
const UPLOAD_DIR = path.join(
    __dirname,
    '../uploads/employees'
);

// Create folder automatically if it does not exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `employee-${Date.now()}${extension}`;

        cb(null, filename);
    }
});

// Allow image files only
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'));
    }
};

// Configure Multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024  
    }
});

// Middleware for a single employee profile image
const handleImageUpload = (req, res, next) => {
    upload.single('profile_image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        next();
    });
};

module.exports = {
    upload,
    handleImageUpload,
    UPLOAD_DIR
};
