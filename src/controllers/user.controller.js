import { User } from "../models/user.model.js";
import ApiError from "../utils/apierror.js";
import jwt from "jsonwebtoken";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

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

  if (!userName || !email || !password || !contact || !gender)
    throw new ApiError(400, "All fields are required");

  if (!/^[0-9]{10}$/.test(contact))
    throw new ApiError(400, "Contact must be exactly 10 digits");

  if (password.length < 8)
    throw new ApiError(400, "Password must be at least 8 characters");

  const existingUser = await User.findOne({ $or: [{ email }, { contact }] });
  if (existingUser)
    throw new ApiError(409, "User already exists with this email or contact");

  const newUser = await User.create({ userName, email, password, contact, gender });
  const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

  return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// 🔹 LOGIN USER  ← FIXED: maxAge on cookies + tokens in response body
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ApiError(400, "Email and password are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedUser = await User.findById(user._id).select("-password -refreshToken");

  // Access token: short-lived (15 min)
  const accessOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  };

  // Refresh token: long-lived (7 days) — survives browser restarts
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
    // ✅ Also return tokens in body so frontend can store in localStorage
    .json(new ApiResponse(200, { user: loggedUser, accessToken, refreshToken }, "Login successful"));
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

export {
  registerUser, loginUser, logoutUser, refreshAccessToken,
  getAllUsers, getUserById, deleteUserById, updateProfile, updateUserRole
};
