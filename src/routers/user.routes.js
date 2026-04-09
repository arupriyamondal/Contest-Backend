import { Router } from "express";
import {deleteUserById, forgotPassword, getAllUsers, getUserById, loginUser,logoutUser,refreshAccessToken,registerUser, resetPassword, sendVerificationEmail, updateProfile, updateProfileImage, updateUserRole, verifyEmail} from "../controllers/user.controller.js";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { upload } from "../middlewares/multer.js";


const router = Router();


router.post(
  "/register-user",
  upload.single("profileImage"), // ✅ THIS IS REQUIRED
  registerUser
);
router.post("/login-user", loginUser);


// Logout (only logged-in users)
router.get("/logout-user", verifyJWT, logoutUser);

// Get current user (VERY IMPORTANT)
router.get("/me", verifyJWT, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ==============================
// 🔹 USER ROUTES
// ==============================

// Normal user dashboard (any logged-in user)
router.get("/user-dashboard", verifyJWT, (req, res) => {
  res.json({
    success: true,
    message: "User dashboard",
    user: req.user
  });
});

// ==============================
// 🔹 ADMIN ROUTES
// ==============================

// Admin-only dashboard
router.get(
  "/admin-dashboard",
  verifyJWT,
  isAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: "Admin dashboard",
      user: req.user
    });
  }
);



router.get("/generate-access",refreshAccessToken)
router.get("/get-all-users",verifyJWT,isAdmin,getAllUsers)
router.get("/get-user/:id",verifyJWT,isAdmin,getUserById)
router.delete("/delete-user/:id",verifyJWT,isAdmin,deleteUserById)
router.put("/update-user",verifyJWT,updateProfile)
router.patch("/update-role/:id", verifyJWT, isAdmin, updateUserRole);

router.post("/send-verification", sendVerificationEmail);
router.get("/verify-email/:token", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


router.put(
  "/update-profile",
  verifyJWT,
  upload.single("profileImage"),
  updateProfileImage
);
export default router;