import { Router } from "express";
import { addContest, getAllContests, updateContestStatus } from "../controllers/contest.controller.js";
import { verifyJWT } from "../middlewares/verifyJwt.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const contestrouter = Router();

// ➤ Add Contest
contestrouter.post("/add-contest", verifyJWT, isAdmin, addContest);

// ➤ Get All Contests (Admin)
contestrouter.get("/all-contests", verifyJWT, isAdmin, getAllContests);

// ➤ Get Contests (Student/User)
contestrouter.get("/stu-contest", verifyJWT, getAllContests);

// ➤ Update Contest Status (Admin only)
contestrouter.patch("/update-status/:contestId",verifyJWT,isAdmin,updateContestStatus);

export default contestrouter;