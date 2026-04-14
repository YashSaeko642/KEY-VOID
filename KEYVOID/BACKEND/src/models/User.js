const mongoose = require("mongoose");

const USER_ROLES = ["user", "creator", "admin"];

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 24
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationTokenHash: {
      type: String,
      default: ""
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    passwordResetTokenHash: {
      type: String,
      default: ""
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "user"
    },
    isCreator: {
      type: Boolean,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("validate", function syncRoleFields(next) {
  if (!this.role) {
    this.role = this.isCreator ? "creator" : "user";
  }

  this.isCreator = this.role === "creator";
  next();
});

userSchema.methods.hasRole = function hasRole(role) {
  return this.role === role;
};

userSchema.statics.USER_ROLES = USER_ROLES;

module.exports = mongoose.model("User", userSchema);
