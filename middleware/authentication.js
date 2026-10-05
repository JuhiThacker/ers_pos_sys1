const jwt = require('jsonwebtoken');


// ==================================================
// AUTHENTICATION MIDDLEWARE
// ==================================================

const authentication = (req, res, next) => {

    try {

        let token = null;


        // ------------------------------------------------
        // OPTION 1: Authorization Header
        // ------------------------------------------------

        const authHeader =
            req.headers.authorization;


        if (authHeader) {

            const parts =
                authHeader.split(' ');


            if (
                parts.length === 2 &&
                parts[0] === 'Bearer' &&
                parts[1]
            ) {

                token = parts[1];

            }

        }


        // ------------------------------------------------
        // OPTION 2: HTTP-Only Cookie
        // ------------------------------------------------

        if (!token && req.cookies) {

            token = req.cookies.token;

        }


        // ------------------------------------------------
        // Token Missing
        // ------------------------------------------------

        if (!token) {

            return res.status(401).json({

                success: false,

                error:
                    'Authentication token missing.'
            });
        }


        // ------------------------------------------------
        // Check JWT Secret
        // ------------------------------------------------

        if (!process.env.JWT_SECRET) {

            console.error(
                'JWT_SECRET is missing from .env'
            );

            return res.status(500).json({

                success: false,

                error:
                    'JWT secret is not configured.'
            });
        }


        // ------------------------------------------------
        // Verify Token
        // ------------------------------------------------

        const decoded =
            jwt.verify(
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

                error:
                    'Token expired.'
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

                error:
                    'Invalid token.'
            });
        }


        // ------------------------------------------------
        // Other Authentication Error
        // ------------------------------------------------

        return res.status(401).json({

            success: false,

            error:
                'Authentication failed.'
        });

    }

};


// ==================================================
// EXPORT
// ==================================================

module.exports = {
    authentication
};