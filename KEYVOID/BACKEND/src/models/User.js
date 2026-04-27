const mongoose = require("mongoose");

const USER_ROLES = ["user", "creator", "admin"];

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
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
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: null
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
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
      required() {
        return this.authProvider !== "google";
      },
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
    bio: {
      type: String,
      trim: true,
      maxlength: 280,
      default: ""
    },
    location: {
      type: String,
      trim: true,
      maxlength: 60,
      default: ""
    },
    website: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ""
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    avatarPublicId: {
      type: String,
      trim: true,
      default: ""
    },
    bannerUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    bannerPublicId: {
      type: String,
      trim: true,
      default: ""
    },
    favoriteGenres: {
      type: [String],
      default: []
    },
    isCreator: {
      type: Boolean,
      default: undefined
    },
    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    following: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("validate", function syncRoleFields() {
  if (!this.role) {
    this.role = this.isCreator ? "creator" : "user";
  }

  this.isCreator = this.role === "creator";
});

userSchema.methods.hasRole = function hasRole(role) {
  return this.role === role;
};

userSchema.statics.USER_ROLES = USER_ROLES;

module.exports = mongoose.model("User", userSchema);
