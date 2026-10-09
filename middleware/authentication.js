const jwt = require("jsonwebtoken");

const authentication = (req, res, next) => {
    try {
        let token = null;

        // 1. Check Authorization header
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7).trim();
        }

        // 2. If no Bearer token, check cookie
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authentication token missing.",
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                error: "JWT secret is not configured.",
            });
        }

        // 3. Temporary diagnostics
        const decoded = jwt.decode(token);

        console.log("Auth source:", authHeader ? "Authorization header" : "Cookie");
        console.log(
            "Token expires at:",
            decoded?.exp
                ? new Date(decoded.exp * 1000).toISOString()
                : "Missing"
        );
        console.log("Current server time:", new Date().toISOString());

        // 4. Verify token
        req.user = jwt.verify(token, process.env.JWT_SECRET);

        next();
    } catch (error) {
        console.error("JWT Error:", error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                error: "Token expired. Please log in again.",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                error: "Invalid token.",
            });
        }

        return res.status(401).json({
            success: false,
            error: "Authentication failed.",
        });
    }
};

module.exports = { authentication };
