const path = require('path');
const profileRoutes = require('./routes/profile');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(profileRoutes);