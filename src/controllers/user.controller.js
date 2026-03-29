import { User } from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";


// 🔹 Generate Tokens
const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found while generating token");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// 🔹 REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, password, contact, gender } = req.body;

  // ✅ Required fields
  if (!userName || !email || !password || !contact || !gender) {
    throw new ApiError(400, "All fields are required");
  }

  // ✅ Contact validation
  if (!/^[0-9]{10}$/.test(contact)) {
    throw new ApiError(400, "Contact must be exactly 10 digits");
  }

  // ✅ Password validation
  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  // ✅ Check existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { contact }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists with this email or contact");
  }

  // ✅ Create user
  const newUser = await User.create({
    userName,
    email,
    password,
    contact,
    gender,
  });

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// 🔹 LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user._id);

  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, { user: loggedUser }, "Login successful")
    );
});

// 🔹 LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await User.findOneAndUpdate(
      { refreshToken },
      { refreshToken: null }
    );
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

export { registerUser, loginUser, logoutUser };