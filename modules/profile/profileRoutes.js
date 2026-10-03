const express = require('express');
const { authentication } = require('../../middleware/auth.js');
const { handleImageUpload } = require('../../middleware/upload.js');
const { getProfile, updateProfile, updateImage } = require('../../controllers/profile/profileController.js');

const router = express.Router();

// Mounted at /api/profile in app.js
router.get('/', authentication, getProfile);                               // GET  /api/profile
router.put('/', authentication, updateProfile);                            // PUT  /api/profile
router.post('/image', authentication, handleImageUpload, updateImage);     // POST /api/profile/image

module.exports = router;