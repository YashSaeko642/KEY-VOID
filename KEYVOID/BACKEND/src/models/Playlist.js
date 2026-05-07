const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    tracks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Audio"
      }
    ],
    isPublic: {
      type: Boolean,
      default: false
    },
    coverUrl: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Playlist", playlistSchema);
