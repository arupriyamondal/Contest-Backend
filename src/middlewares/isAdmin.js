import ApiError from "../utils/apiError.js";


export const isAdmin = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  if (req.user.role !== "Admin") {
    throw new ApiError(403, "You should be admin");
  }

  next();
};