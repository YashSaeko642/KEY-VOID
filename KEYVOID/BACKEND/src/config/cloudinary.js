const { v2: cloudinary } = require("cloudinary");

function getCloudinaryFolder(...parts) {
  const rootFolder = String(process.env.CLOUDINARY_FOLDER || "keyvoid").trim();
  return [rootFolder, ...parts].filter(Boolean).join("/");
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = {
  cloudinary,
  getCloudinaryFolder,
  isCloudinaryConfigured
};
