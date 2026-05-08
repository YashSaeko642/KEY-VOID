const nodemailer = require("nodemailer");

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  };
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "KeyVoid <no-reply@keyvoid.local>";
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.log("Password reset link:", resetUrl);
    return { sent: false, preview: resetUrl };
  }

  const transporter = nodemailer.createTransport(smtpConfig);

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your KeyVoid password",
    text: [
      "Use this link to reset your KeyVoid password:",
      resetUrl,
      "",
      "This link expires in 15 minutes. If you did not request it, you can ignore this email."
    ].join("\n"),
    html: `
      <p>Use this link to reset your KeyVoid password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>
    `
  });

  return { sent: true };
}

async function sendVerificationEmail({ to, verifyUrl }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "KeyVoid <no-reply@keyvoid.local>";
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.log("Email verification link:", verifyUrl);
    return { sent: false, preview: verifyUrl };
  }

  const transporter = nodemailer.createTransport(smtpConfig);

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your KeyVoid email",
    text: [
      "Use this link to verify your KeyVoid email:",
      verifyUrl,
      "",
      "This link expires soon. If you did not create a KeyVoid account, you can ignore this email."
    ].join("\n"),
    html: `
      <p>Use this link to verify your KeyVoid email:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires soon. If you did not create a KeyVoid account, you can ignore this email.</p>
    `
  });

  return { sent: true };
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail
};
