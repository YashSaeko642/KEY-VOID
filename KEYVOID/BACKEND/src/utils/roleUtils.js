const ADMIN_ROLE = "admin";
const CREATOR_ROLE = "creator";
const USER_ROLE = "user";

function normalizeTrustedEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function getConfiguredAdminEmails() {
  const rawValue = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";

  return rawValue
    .split(",")
    .map((email) => normalizeTrustedEmail(email))
    .filter(Boolean);
}

function isTrustedAdminEmail(email = "") {
  const normalizedEmail = normalizeTrustedEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return getConfiguredAdminEmails().includes(normalizedEmail);
}

async function syncSystemRole(user) {
  if (!user) {
    return user;
  }

  const shouldBeAdmin = isTrustedAdminEmail(user.email);
  const nextRole = shouldBeAdmin ? ADMIN_ROLE : user.role || USER_ROLE;

  if (user.role !== nextRole) {
    user.role = nextRole;
    await user.save();
  }

  return user;
}

function roleAllows(requiredRole, currentRole) {
  if (currentRole === ADMIN_ROLE) {
    return true;
  }

  return currentRole === requiredRole;
}

module.exports = {
  ADMIN_ROLE,
  CREATOR_ROLE,
  USER_ROLE,
  getConfiguredAdminEmails,
  isTrustedAdminEmail,
  normalizeTrustedEmail,
  roleAllows,
  syncSystemRole
};
