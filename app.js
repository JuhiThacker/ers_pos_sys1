const path = require('path');
const profileRoutes = require('./modules/profile/profileRoutes');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/profile', profileRoutes);
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'views', 'profile.html')));