// Dependencies
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { roleAllows, syncSystemRole } = require("../utils/roleUtils");

/**
 * Authentication middleware - Protects routes by verifying JWT tokens
 * Extracts user from token and attaches to req.user
 * @middleware
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: "JWT secret is not configured" });
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ msg: "User no longer exists" });
    }

    // Sync system role (admin check) and attach to request
    req.user = await syncSystemRole(user);
    next();
  } catch (error) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
}

/**
 * Role authorization middleware - Restricts routes to specific roles
 * Must be used after protect() middleware
 * @middleware
 * @param {...string} allowedRoles - Roles that are allowed access
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: "Authentication required" });
    }

    const hasAccess = allowedRoles.some((role) => roleAllows(role, req.user.role));

    if (!hasAccess) {
      return res.status(403).json({ msg: "You do not have permission to access this resource" });
    }

    next();
  };
}

module.exports = { protect, authorizeRoles };
