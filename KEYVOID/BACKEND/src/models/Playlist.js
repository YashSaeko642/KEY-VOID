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
    type: {
      type: String,
      enum: ["playlist", "liked"],
      default: "playlist"
    },
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

playlistSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model("Playlist", playlistSchema);
