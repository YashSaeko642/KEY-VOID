const mongoose = require("mongoose");

const authAuditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    action: {
      type: String,
      required: true
    },
    success: {
      type: Boolean,
      required: true
    },
    ip: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("AuthAuditLog", authAuditLogSchema);
