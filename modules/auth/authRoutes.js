const express = require('express');
const { login, logout } = require('../../controllers/auth/authController');
const { authValidator } = require('../../validator/authValidator.js');
const pool = require('../../config/db.js');
const { authentication } = require('../../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authentication, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;