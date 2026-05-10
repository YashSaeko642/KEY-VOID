const mongoose = require("mongoose");
const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    mediaUrl: {
      type: String,
      default: ""
    },
    mediaPublicId: {
      type: String,
      default: ""
    },
    mediaType: {
      type: String,
      enum: ["image", "video", "audio", ""],
      default: ""
    },
    contentType: {
      type: String,
      enum: ["post", "reel"],
      default: "post"
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        text: String,
        isDeleted: {
          type: Boolean,
          default: false
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    uniqueViewers: {
      type: [String],
      default: [],
      select: false
    },
    lastViewedAt: {
      type: Date,
      default: null
    },
    reports: [
      {
        reporter: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        reason: {
          type: String,
          trim: true,
          maxlength: 80,
          default: "Other"
        },
        details: {
          type: String,
          trim: true,
          maxlength: 500,
          default: ""
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    reportCount: {
      type: Number,
      default: 0,
      min: 0
    },
    safetyStatus: {
      type: String,
      enum: ["clear", "reported", "under_review", "restricted"],
      default: "clear"
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, contentType: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, viewCount: -1 });
postSchema.index({ reportCount: -1, safetyStatus: 1 });

module.exports = mongoose.model("Post", postSchema);
