const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");              // your existing Mongoose model
const requireLogin = require("../middleware/requireLogin");

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Image upload (multer) ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `avatar-${req.session.userId}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, GIF or WEBP images are allowed."));
  }
});

// ---------- Validation ----------
function validate({ name, email, phone, dob, address, password }) {
  const errors = [];
  if (name !== undefined && !String(name).trim()) errors.push("Name is required.");
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("Enter a valid email address.");
  if (phone !== undefined && !/^[+\d][\d\s()-]{6,19}$/.test(phone))
    errors.push("Enter a valid phone number.");
  if (dob !== undefined) {
    const d = new Date(dob);
    if (isNaN(d) || d > new Date()) errors.push("Enter a valid date of birth.");
  }
  if (address !== undefined && !String(address).trim()) errors.push("Address is required.");
  if (password && String(password).length < 8)
    errors.push("Password must be at least 8 characters.");
  return errors;
}

// Shape sent to the browser (never includes the password)
function publicUser(u) {
  return {
    name: u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    dob: u.dob ? new Date(u.dob).toISOString().slice(0, 10) : "",
    address: u.address || "",
    image: u.image || ""
  };
}

// ---------- Page route ----------
// GET /profile  -> the profile page (only for logged-in users)
router.get("/profile", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "profile.html"));
});

// ---------- API routes ----------
// GET /api/profile -> current user's data
router.get("/api/profile", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ errors: ["User not found."] });
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ errors: ["Something went wrong."] });
  }
});

// PUT /api/profile -> update fields (password only changes if sent)
router.put("/api/profile", requireLogin, async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ errors: ["User not found."] });

    ["name", "email", "phone", "dob", "address"].forEach((f) => {
      if (req.body[f] !== undefined) user[f] = String(req.body[f]).trim();
    });
    if (req.body.password) user.password = await bcrypt.hash(req.body.password, 10);

    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ errors: ["That email is already in use."] });
    }
    res.status(500).json({ errors: ["Something went wrong."] });
  }
});

// POST /api/profile/image -> upload / replace profile photo
router.post("/api/profile/image", requireLogin, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "Image must be 2 MB or smaller." : err.message;
      return res.status(400).json({ errors: [msg] });
    }
    if (!req.file) return res.status(400).json({ errors: ["No image uploaded."] });

    try {
      const user = await User.findById(req.session.userId);
      if (!user) return res.status(401).json({ errors: ["User not found."] });

      // delete the old photo file
      if (user.image && user.image.startsWith("/uploads/")) {
        const old = path.join(UPLOAD_DIR, path.basename(user.image));
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }

      user.image = "/uploads/" + req.file.filename;
      await user.save();
      res.json(publicUser(user));
    } catch (e) {
      res.status(500).json({ errors: ["Something went wrong."] });
    }
  });
});

module.exports = router;