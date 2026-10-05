const jwt = require('jsonwebtoken');


// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

const authentication = (req, res, next) => {

    try {

        // ------------------------------------------------
        // Get Authorization Header
        // ------------------------------------------------

        const authHeader = req.headers.authorization;


        if (!authHeader) {

            return res.status(401).json({

                success: false,

                error: 'Authorization header missing.'

            });

        }


        // ------------------------------------------------
        // Expected:
        //
        // Authorization: Bearer TOKEN
        // ------------------------------------------------

        const parts = authHeader.split(' ');


        if (
            parts.length !== 2 ||
            parts[0] !== 'Bearer' ||
            !parts[1]
        ) {

            return res.status(401).json({

                success: false,

                error: 'Invalid authorization format.'

            });

        }


        const token = parts[1];


        // ------------------------------------------------
        // Check JWT Secret
        // ------------------------------------------------

        if (!process.env.JWT_SECRET) {

            console.error(
                'JWT_SECRET is missing from .env'
            );

            return res.status(500).json({

                success: false,

                error: 'JWT secret is not configured.'

            });

        }


        // ------------------------------------------------
        // Verify Token
        // ------------------------------------------------

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );


        // ------------------------------------------------
        // Store User Information
        // ------------------------------------------------

        req.user = decoded;


        // ------------------------------------------------
        // Continue
        // ------------------------------------------------

        next();


    } catch (error) {

        console.error(
            'JWT Error:',
            error.message
        );


        // ------------------------------------------------
        // Expired Token
        // ------------------------------------------------

        if (
            error.name === 'TokenExpiredError'
        ) {

            return res.status(401).json({

                success: false,

                error: 'Token expired.'

            });

        }


        // ------------------------------------------------
        // Invalid Token
        // ------------------------------------------------

        if (
            error.name === 'JsonWebTokenError'
        ) {

            return res.status(401).json({

                success: false,

                error: 'Invalid token.'

            });

        }


        // ------------------------------------------------
        // Other Authentication Error
        // ------------------------------------------------

        return res.status(401).json({

            success: false,

            error: 'Authentication failed.'

        });

    }

};


// ==================================================
// EXPORT
// ==================================================

module.exports = {
    authentication
};