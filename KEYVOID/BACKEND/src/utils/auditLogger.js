const AuthAuditLog = require("../models/AuthAuditLog");

async function logAuthEvent({
  user = null,
  email = "",
  action,
  success,
  req,
  metadata = {}
}) {
  try {
    const forwarded = req?.headers?.["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req?.ip || "";
    const userAgent = req?.headers?.["user-agent"] || "";

    await AuthAuditLog.create({
      user,
      email,
      action,
      success,
      ip,
      userAgent,
      metadata
    });
  } catch (error) {
    console.error("Failed to write auth audit log:", error.message);
  }
}

module.exports = { logAuthEvent };
