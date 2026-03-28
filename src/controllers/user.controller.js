import { User } from "../models/user.model.js";



const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = async (req, res) => {
  try {
    const { userName, email, password, contact, gender } = req.body;

    // ✅ Required fields
    if (!userName || !email || !password || !contact || !gender) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // ✅ Contact: exactly 10 digits
    if (!/^[0-9]{10}$/.test(contact)) {
      return res.status(400).json({
        message: "Contact must be exactly 10 digits",
      });
    }

    // ✅ Password: minimum 8 characters
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    // ✅ Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { contact }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email or contact",
      });
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

    return res.status(201).json({
      message: "User registered successfully",
      user: createdUser,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error while creating user",
      error: error.message,
    });
  }
};

// 🔹 LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Check required
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // ✅ Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ✅ Check password
    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // ✅ Generate tokens
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const loggedUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // ✅ Cookie options (IMPORTANT for live + local)
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ true in Render
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        message: "Login successful",
        user: loggedUser, // optional (useful for frontend if needed)
      });

  } catch (error) {
    return res.status(500).json({
      message: "Error during login",
      error: error.message,
    });
  }
};

// 🔹 LOGOUT USER
const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    // ✅ Remove refresh token from DB
    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken: refreshToken },
        { refreshToken: null }
      );
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    // ✅ Clear cookies
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        message: "Logout successful",
      });

  } catch (error) {
    return res.status(500).json({
      message: "Error during logout",
      error: error.message,
    });
  }
};

export { registerUser ,loginUser,logoutUser};