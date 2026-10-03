require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const profileRoutes = require('./modules/profile/profileRoutes');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/profile', profileRoutes);
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'views', 'profile.html')));
const authRoutes = require('./modules/auth/authRoutes');

const app = express(); 

const isLocalNetworkOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    // No origin means Postman, curl, or a same-origin request
    if (!origin || isLocalNetworkOrigin(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));


app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));