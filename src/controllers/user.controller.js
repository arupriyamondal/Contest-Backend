import { User } from "../models/user.model.js";

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

export { registerUser };