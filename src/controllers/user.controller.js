import { User } from "../models/user.model.js";
import ApiError from "../utils/apierror.js";
import jwt from "jsonwebtoken";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";
import crypto from "crypto";
import { sendEmail } from "../utils/mailtrap.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
// 🔹 Generate Tokens
const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found while generating token");

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// 🔹 REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, password, contact, gender } = req.body;

  if (!userName || !email || !password || !contact || !gender) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { contact }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  let profileImageData = {
    url: "",
    public_id: "",
  };

  // ✅ Image upload
  if (req.file) {
    try {
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_images",
      });

      profileImageData = {
        url: uploadedImage.secure_url,
        public_id: uploadedImage.public_id,
      };
    } catch (error) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw new ApiError(500, "Image upload failed");
    }

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }

  // ✅ Create user
  const newUser = await User.create({
    userName,
    email,
    password,
    contact,
    gender,
    profileImage: profileImageData,
  });

  // ✅ 🔥 GENERATE EMAIL TOKEN (IMPORTANT)
  const token = newUser.generateEmailVerificationToken();

  await newUser.save({ validateBeforeSave: false });

  // ✅ Verification link
  const verifyURL = `${process.env.BASE_URL}/api/v1/user/verify-email/${token}`;

  // ✅ Send email
  await sendEmail({
    to: newUser.email,
    subject: "Verify Your Email",
    html: `
      <h2>Email Verification</h2>
      <p>Click below to verify your email:</p>
      <a href="${verifyURL}">${verifyURL}</a>
      <p>This link expires in 10 minutes</p>
    `,
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      createdUser,
      "User registered successfully. Please verify your email."
    )
  );
});

// 🔹 LOGIN USER  ← FIXED: maxAge on cookies + tokens in response body
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ApiError(400, "Email and password are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // ✅ 🔥 CHECK EMAIL VERIFIED (IMPORTANT)
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user._id);

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const accessOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 15 * 60 * 1000,
  };

  const refreshOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessOptions)
    .cookie("refreshToken", refreshToken, refreshOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedUser, accessToken, refreshToken },
        "Login successful"
      )
    );
});

// 🔹 LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "Logout successful"));
});

// 🔹 REFRESH ACCESS TOKEN  ← FIXED: maxAge on cookies + refreshToken in response body
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!incomingRefreshToken)
    throw new ApiError(401, "Refresh token not found");

  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded?.id);
    if (!user) throw new ApiError(401, "Invalid refresh token");

    if (incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "Refresh token is expired or used");

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const accessOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    };

    const refreshOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, accessOptions)
      .cookie("refreshToken", refreshToken, refreshOptions)
      // ✅ Return both tokens in body so frontend can update localStorage
      .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"));
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});

// 🔹 GET ALL USERS
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -refreshToken");
  return res.status(200).json(
    new ApiResponse(200, { total: users.length, users }, "All users fetched successfully")
  );
});

// 🔹 GET USER BY ID
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select("-password -refreshToken");
  if (!user) throw new ApiError(404, "User not found");
  return res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

// 🔹 DELETE USER BY ID
const deleteUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new ApiError(404, "User not found");
  return res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});

// 🔹 UPDATE PROFILE (CONTACT / PASSWORD)
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { contact, oldPassword, newPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (contact) {
    if (!/^[0-9]{10}$/.test(contact))
      throw new ApiError(400, "Contact must be exactly 10 digits");
    const existingUser = await User.findOne({ contact });
    if (existingUser && existingUser._id.toString() !== userId.toString())
      throw new ApiError(409, "Contact already in use");
    user.contact = contact;
  }

  if (newPassword) {
    if (!oldPassword) throw new ApiError(400, "Old password is required");
    const isMatch = await user.isPasswordCorrect(oldPassword);
    if (!isMatch) throw new ApiError(401, "Old password is incorrect");
    if (newPassword.length < 8)
      throw new ApiError(400, "Password must be at least 8 characters");
    user.password = newPassword;
  }

  if (!contact && !newPassword) throw new ApiError(400, "Nothing to update");

  await user.save();
  const updatedUser = await User.findById(userId).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

// 🔹 UPDATE USER ROLE (Admin only)
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["User", "Admin"].includes(role))
    throw new ApiError(400, "Valid role is required (User or Admin)");

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.role === role)
    throw new ApiError(400, `User already has role: ${role}`);

  user.role = role;
  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(id).select("-password -refreshToken");
  return res.status(200).json(new ApiResponse(200, updatedUser, "User role updated successfully"));
});


const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });

  if (!user) throw new ApiError(404, "User not found");

  if (user.isEmailVerified) {
    throw new ApiError(400, "Email already verified");
  }

  const token = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyURL = `${process.env.BASE_URL}/api/v1/user/verify-email/${token}`;

  await sendEmail({
    to: user.email,
    subject: "Verify Your Email",
    html: `
      <h2>Email Verification</h2>
      <p>Click below to verify:</p>
      <a href="${verifyURL}">${verifyURL}</a>
    `,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Verification email resent"));
});
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const successPage = (message) => `
    <html>
      <head>
        <title>Email Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f0fdf4;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .box {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          h2 {
            color: green;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>✅ ${message}</h2>
          <p>You can now login to your account.</p>
        </div>
      </body>
    </html>
  `;

  const errorPage = (message) => `
    <html>
      <head>
        <title>Email Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #fef2f2;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
          }
          .box {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          h2 {
            color: red;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>❌ ${message}</h2>
          <p>Please try again or request a new verification link.</p>
        </div>
      </body>
    </html>
  `;

  if (!token) {
    return res.send(errorPage("Invalid token"));
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.send(errorPage("Token expired or invalid"));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;

  await user.save();

  return res.send(successPage("Email verified successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  // ✅ generate token
  const token = user.generateForgotPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.BASE_URL}/api/v1/user/reset-password/${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset Your Password",
    html: `
      <h2>Forgot Password</h2>
      <p>Click below to reset your password:</p>
      <a href="${resetURL}">${resetURL}</a>
      <p>This link expires in 10 minutes</p>

      <p>OR use this token:</p>
      <h3>${token}</h3>
    `,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Reset email sent"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token) throw new ApiError(400, "Token is required");
  if (!newPassword) throw new ApiError(400, "New password is required");

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired token");
  }

  // ✅ update password
  user.password = newPassword;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;

  await user.save(); // password will auto hash

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successful"));
});


// ✅ Update Profile Image (Delete old + upload new)
const updateProfileImage = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let result;

  try {
    // 🔥 Delete old image from Cloudinary
    if (user.profileImage?.public_id) {
      await cloudinary.uploader.destroy(user.profileImage.public_id);
    }

    // 🔥 Upload new image
    result = await cloudinary.uploader.upload(req.file.path, {
      folder: "profile_images",
    });

  } catch (error) {
    // ❌ If upload fails → delete local file
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw new ApiError(500, "Image upload failed");
  }

  // 🔥 Delete local file safely
  if (req.file?.path && fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
  }

  // 🔥 Save to DB
  user.profileImage = {
    url: result.secure_url,
    public_id: result.public_id,
  };

  await user.save();

  res.status(200).json(
    new ApiResponse(200, user, "Profile image updated successfully")
  );
});
export {
  registerUser, loginUser, logoutUser, refreshAccessToken,
  getAllUsers, getUserById, deleteUserById, updateProfile, updateUserRole,resendVerificationEmail,
  forgotPassword,resetPassword,updateProfileImage,verifyEmail,
};
