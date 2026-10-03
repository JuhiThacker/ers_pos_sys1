
const jwt = require('jsonwebtoken');

const authentication = (req, res, next) => {
  console.log(req.method, req.originalUrl, '| origin:', req.headers.origin, '| auth header:', req.headers.authorization ? 'YES' : 'NO', '| cookie:', req.cookies.token ? 'YES' : 'NO');
  try {
    const header = req.headers.authorization;
    const token =
      req.cookies.token ||
      (header && header.startsWith('Bearer ') ? header.slice(7) : null);

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// Usage: router.post('/sales', authentication, authorize('create_sale'), handler)
const authorize = (...required) => (req, res, next) => {
  const has = req.user?.permissions || [];
  if (!required.every((p) => has.includes(p))) {
    return res.status(403).json({ error: 'Forbidden. Missing permission.' });
  }
  next();
};

module.exports = { authentication, authorize };