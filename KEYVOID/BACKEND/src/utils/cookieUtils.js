const REFRESH_COOKIE_NAME = "keyvoid_refresh_token";

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  // In production (Vercel → Render = cross-site), we MUST use:
  //   sameSite: "none"  — allows cross-site cookies
  //   secure: true      — required whenever sameSite is "none"
  // In development (both on localhost), "lax" is fine and works without HTTPS
  const sameSite = isProduction ? "none" : "lax";

  return {
    httpOnly: true,
    secure: isProduction,   // true in prod (HTTPS), false in dev (HTTP)
    sameSite,
    path: "/",
    maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 7) * 24 * 60 * 60 * 1000
  };
}

function setRefreshTokenCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, getCookieOptions());
}

function clearRefreshTokenCookie(res) {
  // Must pass same options as set (especially sameSite + secure + path)
  // otherwise the browser won't match and won't clear the cookie
  res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
}

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return "";
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim());

  for (const entry of cookies) {
    const [cookieName, ...valueParts] = entry.split("=");
    if (cookieName.trim() === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
}

module.exports = {
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getCookieValue
};