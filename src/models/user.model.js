import mongoose, { model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    contact: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10}$/,
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "others"],
    },

    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
    },

    role: {
      type: String,
      enum: ["User", "Admin"],
      default: "User",
    },

    // ✅ Profile Image (Cloudinary)
    profileImage: {
      url: {
        type: String, // Cloudinary image URL
        default: "",
      },
      public_id: {
        type: String, // Cloudinary public_id (important for delete/update)
        default: "",
      },
    },

    refreshToken: {
      type: String,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
    },

    emailVerificationTokenExpiry: {
      type: Date,
    },

    forgotPasswordToken: {
      type: String,
    },

    forgotPasswordTokenExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 🔐 Hash password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// 🔐 Compare password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// 🔐 Tokens
userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
  });
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });
};

// 🔐 Email Verification Token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  this.emailVerificationToken = hashedToken;
  this.emailVerificationTokenExpiry = Date.now() + 10 * 60 * 1000;

  return token;
};

// 🔐 Forgot Password Token
userSchema.methods.generateForgotPasswordToken = function () {
  const token = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  this.forgotPasswordToken = hashedToken;
  this.forgotPasswordTokenExpiry = Date.now() + 10 * 60 * 1000;

  return token;
};

const User = model("User", userSchema);

export { User };