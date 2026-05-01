#!/usr/bin/env node

require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Audio = require("../src/models/Audio");
const { initGridFS, uploadFileToGridFS } = require("../src/utils/gridfsUtils");

const MUSIC_FOLDER = path.join(process.env.HOME || process.env.USERPROFILE || "", "Downloads", "music");

function parseMetadataFromFilename(filename) {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  const parts = nameWithoutExt.split("-");

  let artist = "Unknown Artist";
  let title = nameWithoutExt;
  let genre = "Uncategorized";

  if (parts.length >= 2) {
    artist = parts[0].split("_").join(" ");

    const lastParts = parts.slice(1).join(" ");
    const lowerLastParts = lastParts.toLowerCase();

    if (lowerLastParts.includes("metal")) {
      genre = "Metal";
      title = lastParts;
    } else if (lowerLastParts.includes("blues")) {
      genre = "Blues";
      title = lastParts;
    } else if (lowerLastParts.includes("doom")) {
      genre = "Metal";
      title = lastParts;
    } else if (lowerLastParts.includes("black metal")) {
      genre = "Black Metal";
      title = lastParts;
    } else if (lowerLastParts.includes("heavy metal")) {
      genre = "Heavy Metal";
      title = lastParts;
    } else if (lowerLastParts.includes("instrumental")) {
      genre = "Instrumental";
      title = lastParts;
    } else {
      title = lastParts;
    }
  }

  title = title.split("_").join(" ");
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return { artist, title, genre };
}

async function uploadMusicFiles() {
  try {
    if (!fs.existsSync(MUSIC_FOLDER)) {
      console.error(`❌ Music folder not found: ${MUSIC_FOLDER}`);
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    initGridFS(mongoose.connection);
    console.log("✅ GridFS initialized");

    const files = fs.readdirSync(MUSIC_FOLDER).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".mp3", ".wav", ".flac", ".m4a", ".aac"].includes(ext);
    });

    if (files.length === 0) {
      console.log("⚠️  No audio files found in music folder");
      process.exit(0);
    }

    console.log(`\n📁 Found ${files.length} audio files. Starting upload...\n`);

    for (const file of files) {
      const filePath = path.join(MUSIC_FOLDER, file);
      const fileStats = fs.statSync(filePath);
      const { artist, title, genre } = parseMetadataFromFilename(file);

      try {
        const existingAudio = await Audio.findOne({ filename: file });
        if (existingAudio) {
          console.log(`⏭️  Skipping (already uploaded): ${file}`);
          continue;
        }

        console.log(`⬆️  Uploading: ${file}`);
        const uploadResult = await uploadFileToGridFS(filePath, file);

        const audio = await Audio.create({
          title,
          artist,
          genre,
          filename: file,
          gridFsId: uploadResult.id,
          fileSize: fileStats.size,
          mimeType: "audio/mpeg",
          source: "library",
          isPublic: true
        });

        console.log(`✅ Uploaded: ${title} by ${artist} (${genre})\n`);
      } catch (error) {
        console.error(`❌ Failed to upload ${file}:`, error.message);
      }
    }

    console.log("\n✅ Music upload complete!");
    const totalTracks = await Audio.countDocuments({ source: "library" });
    console.log(`📊 Total library tracks: ${totalTracks}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    process.exit(1);
  }
}

uploadMusicFiles();
