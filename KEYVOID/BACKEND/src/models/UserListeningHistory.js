const mongoose = require("mongoose");

const userListeningHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    track: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Audio",
      required: true
    },
    genre: {
      type: String,
      default: "Uncategorized"
    },
    artist: {
      type: String,
      default: "Unknown Artist"
    },
    listeningTime: {
      type: Number,
      default: 0,
      description: "Milliseconds listened"
    },
    completed: {
      type: Boolean,
      default: false
    },
    liked: {
      type: Boolean,
      default: false
    },
    playCount: {
      type: Number,
      default: 1
    },
    lastPlayedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

userListeningHistorySchema.index({ user: 1, track: 1 }, { unique: true });

module.exports = mongoose.model("UserListeningHistory", userListeningHistorySchema);
