import {Router} from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/verifyJwt.js";

const router = Router();

router.route("/register-user").post(registerUser);
router.route("/login-user").post(loginUser);
router.route("/logout-user").get(verifyJWT,logoutUser)


export default router;