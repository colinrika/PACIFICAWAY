const jwt = require("jsonwebtoken");
function requireAuth(req, res, next) {
  const h = req.headers["authorization"];
  if (!h)
    return res.status(401).json({ error: "Missing Authorization header" });
  const [scheme, token] = h.split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ error: "Invalid Authorization" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
module.exports = { requireAuth, requireRole };
