// Replace this with your existing auth middleware if you already have one.
// Assumes your login route sets: req.session.userId = user._id
module.exports = function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();

  // API calls get JSON, page requests get redirected to login
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(401).json({ errors: ["Please log in."] });
  }
  res.redirect("/login");
};