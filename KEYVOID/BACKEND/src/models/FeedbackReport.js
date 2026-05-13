const mongoose = require("mongoose");

const feedbackReportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Feature idea", "Bug report", "Question"],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 90
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 700
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null // null = anonymous / not logged in
    },
    submitterUsername: {
      type: String,
      default: "Anonymous"
    },
    status: {
      type: String,
      enum: ["Open", "Under review", "In progress", "Solved", "Closed"],
      default: "Open"
    },
    adminReply: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    adminRepliedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

feedbackReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("FeedbackReport", feedbackReportSchema);