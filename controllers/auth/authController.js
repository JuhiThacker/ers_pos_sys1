const { authValidator } = require('../../validator/authValidator.js');
const pool = require('../../config/db.js');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

// Check your status table and set this to the id that means "active"
const ACTIVE_STATUS_ID = 1;

// Login
const login = async (req, res) => {
  const validation = authValidator.safeParse(req.body);
  if (!validation.success) {
    const errorMessages = validation.error.issues.map((err) => err.message);
    return res.status(400).json({ error: errorMessages });
  }

  const { username, password } = validation.data;

  try {
    const [rows] = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.password_hash,
         u.status_id,
         e.id AS employee_id,
         e.franchise_id,
         e.name,
         e.employee_code
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = rows[0];

    const isMatch = await argon2.verify(user.password_hash, password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status_id !== ACTIVE_STATUS_ID) {
      return res.status(403).json({ error: 'Account is not active.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        employeeId: user.employee_id,
        franchiseId: user.franchise_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
  message: "Login successfully. Welcome, " + user.username + "!",
  token,
  user: {
    id: user.id,
    username: user.username,
    name: user.name,
    employee_code: user.employee_code,
  },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

// Logout
const logout = async (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logout successfully.' });
};

module.exports = { login, logout };