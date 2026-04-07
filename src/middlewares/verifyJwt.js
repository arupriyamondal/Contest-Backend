import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import ApiError from "../utils/apierror.js";

export const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return next(new ApiError(401, "Unauthorized Token"));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    const user = await User.findById(decoded.id).select(
      "-password -refreshToken"
    );
    
    if (!user) {
      return next(new ApiError(401, "Invalid Access Token"));
    }
    
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};