const mongoose = require("mongoose");

const voidSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    mode: {
      type: String,
      enum: ["familiar", "mixed", "explore"],
      required: true
    },
    genre: {
      type: String,
      default: null,
      trim: true
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 180
    },
    skipDelay: {
      type: Number,
      default: 30,
      min: 0,
      description: "Seconds before user can skip a track"
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    playedTracks: [
      {
        track: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Audio"
        },
        playedAt: {
          type: Date,
          default: Date.now
        },
        skipped: {
          type: Boolean,
          default: false
        },
        timeListened: {
          type: Number,
          default: 0,
          description: "Seconds listened"
        }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    exitedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("VoidSession", voidSessionSchema);
