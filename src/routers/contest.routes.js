import { Router } from "express";
import { addContest, getAllContests } from "../controllers/contest.controller.js";
import { verifyJWT } from "../middlewares/verifyJwt.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const contestrouter = Router();

// ➤ Add Contest
contestrouter.post("/add-contest",verifyJWT,isAdmin, addContest);

// ➤ Get All Contests
contestrouter.get("/all-contests",verifyJWT,isAdmin, getAllContests);

contestrouter.get("/stu-contest",verifyJWT,getAllContests)

export default contestrouter;