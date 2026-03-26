import { User } from "../models/user.model.js";

const registerUser = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
      return res.status(400).json({ message: "All feilds are required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User Already Exits" });
    }

    const newUser = await User.create({
      userName,
      email,
      password,
    });

    if (!newUser) {
      return res
        .status(500)
        .json({ message: "Something went wrong while creating user", error });
    }

    return res
      .status(201)
      .json({ message: "User regsiter successfully", newUser });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error while creating user", error });
  }
};


export {registerUser};
