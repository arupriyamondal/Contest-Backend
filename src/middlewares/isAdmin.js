import ApiError from "../utils/apierror.js";

export const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "User not authenticated"));
    }

    if (req.user.role !== "Admin") {
      return next(new ApiError(403, "You should be admin"));
    }

    next();
  } catch (error) {
    next(error);
  }
};