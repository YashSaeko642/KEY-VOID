const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const requestLog = new Map();

function cleanupExpired(now) {
  for (const [key, entry] of requestLog.entries()) {
    if (entry.resetAt <= now) {
      requestLog.delete(key);
    }
  }
}

function getRequestKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip;
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  return `${ip}:${email}`;
}

function authRateLimiter(req, res, next) {
  const now = Date.now();
  cleanupExpired(now);

  const key = getRequestKey(req);
  const current = requestLog.get(key);

  if (!current || current.resetAt <= now) {
    requestLog.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (current.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      msg: "Too many auth attempts. Please wait a few minutes and try again."
    });
  }

  current.count += 1;
  requestLog.set(key, current);
  return next();
}

module.exports = { authRateLimiter };
