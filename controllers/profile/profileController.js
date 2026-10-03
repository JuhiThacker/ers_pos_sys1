const pool = require('../../config/db.js');
const argon2 = require('argon2');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../../middleware/upload.js');

// ---------- Helpers ----------
const PROFILE_QUERY = `
  SELECT
    u.username,
    e.name,
    e.email,
    e.phone,
    DATE_FORMAT(e.dob, '%Y-%m-%d') AS dob,
    e.address,
    e.image
  FROM users u
  LEFT JOIN employees e ON e.user_id = u.id
  WHERE u.id = ?`;

async function loadProfile(userId) {
  const [rows] = await pool.query(PROFILE_QUERY, [userId]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    username: r.username || '',
    name: r.name || '',
    email: r.email || '',
    phone: r.phone || '',
    dob: r.dob || '',
    address: r.address || '',
    image: r.image || '',
  };
}

function validate({ name, email, phone, dob, password }) {
  const errors = [];
  if (name !== undefined && !String(name).trim()) errors.push('Name is required.');
  if (email !== undefined && email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('Enter a valid email address.');
  if (phone !== undefined && phone !== '' && !/^[+\d][\d\s()-]{6,19}$/.test(phone))
    errors.push('Enter a valid phone number.');
  if (dob !== undefined && dob !== '') {
    const d = new Date(dob);
    if (isNaN(d) || d > new Date()) errors.push('Enter a valid date of birth.');
  }
  if (password && String(password).length < 8)
    errors.push('Password must be at least 8 characters.');
  return errors;
}

// ---------- Get profile ----------
const getProfile = async (req, res) => {
  try {
    const profile = await loadProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json(profile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

// ---------- Update profile (password only changes if one is sent) ----------
const updateProfile = async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sets = [];
    const values = [];
    ['name', 'email', 'phone', 'dob', 'address'].forEach((field) => {
      if (req.body[field] !== undefined) {
        const v = String(req.body[field]).trim();
        sets.push(`${field} = ?`);
        values.push(v === '' && field !== 'name' ? null : v); // empty optional field -> NULL
      }
    });

    if (sets.length) {
      const [result] = await conn.query(
        `UPDATE employees SET ${sets.join(', ')} WHERE user_id = ?`,
        [...values, req.user.userId]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'No employee record found for this user.' });
      }
    }

    if (req.body.password) {
      const hash = await argon2.hash(req.body.password); // same as login uses
      await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.userId]);
    }

    await conn.commit();
    return res.status(200).json(await loadProfile(req.user.userId));
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'That email is already in use.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong.' });
  } finally {
    conn.release();
  }
};

// ---------- Upload / replace profile photo ----------
const updateImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

  try {
    const [rows] = await pool.query('SELECT image FROM employees WHERE user_id = ?', [req.user.userId]);
    if (rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'No employee record found for this user.' });
    }

    // delete the old photo file
    const old = rows[0].image;
    if (old && old.startsWith('/uploads/')) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(old));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await pool.query('UPDATE employees SET image = ? WHERE user_id = ?', [
      '/uploads/' + req.file.filename,
      req.user.userId,
    ]);
    return res.status(200).json(await loadProfile(req.user.userId));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

module.exports = { getProfile, updateProfile, updateImage };