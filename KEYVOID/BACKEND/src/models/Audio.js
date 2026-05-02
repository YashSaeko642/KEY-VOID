const mongoose = require("mongoose");

const audioSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    artist: {
      type: String,
      default: "Unknown Artist",
      trim: true
    },
    genre: {
      type: String,
      default: "Uncategorized",
      trim: true
    },
    audienceTags: {
      type: [
        {
          tag: {
            type: String,
            required: true,
            trim: true
          },
          voters: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User"
            }
          ]
        }
      ],
      default: []
    },
    duration: {
      type: Number,
      default: 0
    },
    filename: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    gridFsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: "audio/mpeg"
    },
    source: {
      type: String,
      enum: ["library", "user-upload"],
      default: "library"
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Audio", audioSchema);
