const mongoose = require("mongoose");
const GridFSBucket = require("mongodb").GridFSBucket;
const fs = require("fs");
const path = require("path");

let gridFSBucket = null;

function initGridFS(connection) {
  gridFSBucket = new GridFSBucket(connection.getClient().db("keyvoid"), {
    bucketName: "audio"
  });
  return gridFSBucket;
}

function getGridFSBucket() {
  if (!gridFSBucket) {
    throw new Error("GridFS not initialized. Call initGridFS first.");
  }
  return gridFSBucket;
}

async function uploadFileToGridFS(filePath, filename) {
  const bucket = getGridFSBucket();
  const fileStream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        uploadedAt: new Date(),
        originalPath: filePath
      }
    });

    fileStream
      .pipe(uploadStream)
      .on("error", (error) => {
        reject(new Error(`GridFS upload failed: ${error.message}`));
      })
      .on("finish", () => {
        resolve({
          id: uploadStream.id,
          filename: filename,
          fileSize: uploadStream._uploadStream?.fs?.s.length || 0
        });
      });
  });
}

async function getFileFromGridFS(fileId) {
  const bucket = getGridFSBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

async function deleteFileFromGridFS(fileId) {
  const bucket = getGridFSBucket();
  return bucket.delete(new mongoose.Types.ObjectId(fileId));
}

async function findFileInGridFS(filename) {
  const bucket = getGridFSBucket();
  const files = await bucket.find({ filename }).toArray();
  return files.length > 0 ? files[0] : null;
}

module.exports = {
  initGridFS,
  getGridFSBucket,
  uploadFileToGridFS,
  getFileFromGridFS,
  deleteFileFromGridFS,
  findFileInGridFS
};
