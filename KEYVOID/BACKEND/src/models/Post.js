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

module.exports = mongoose.model("Post", postSchema);
