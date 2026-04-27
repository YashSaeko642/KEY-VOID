const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    followed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure a user cannot follow the same person twice
followSchema.index({ follower: 1, followed: 1 }, { unique: true });

const Follow = mongoose.model("Follow", followSchema);

module.exports = Follow;