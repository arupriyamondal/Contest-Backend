import { Router } from "express";
import {loginUser,logoutUser,registerUser} from "../controllers/user.controller.js";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { isAdmin } from "../middlewares/isAdmin.js";


const router = Router();


router.post("/register-user", registerUser);
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

export default router;