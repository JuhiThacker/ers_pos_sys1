require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const companyProfileRoutes = require('./routes/companyProfileRoutes');
const roleRoutes = require('./routes/roleRoutes');

const app = express();

// MIDDLEWARE

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(cookieParser());

// ROUTES

app.use(
    '/api/auth',
    authRoutes
);

app.use(
    '/api/employees',
    employeeRoutes
);

app.use(
    '/api/company-profile',
    companyProfileRoutes
);

app.use('/api/roles', roleRoutes);

// TEST ROUTES

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'POS System Backend is Running'
    });
});

app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'POS API is Working'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy'
    });
});


// 404

app.use((req, res) => {

    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.originalUrl} not found.`
    });

});

// ERROR HANDLER

app.use((err, req, res, next) => {

    console.error('Server Error:', err);

    res.status(500).json({
        success: false,
        error: 'Internal server error.'
    });

});

// START SERVER

const PORT = process.env.PORT || 3000;

app.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);

