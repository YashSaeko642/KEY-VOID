const REFRESH_COOKIE_NAME = "keyvoid_refresh_token";

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/api/auth",
    maxAge: Number(process.env.REFRESH_TOKEN_DAYS || 7) * 24 * 60 * 60 * 1000
  };
}

function setRefreshTokenCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, getCookieOptions());
}

function clearRefreshTokenCookie(res) {
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
    if (cookieName === name) {
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
