import { Router } from "express";
import {
  addContest,
  deleteContest,
  getAllContests,
  updateContestImage,
  updateContestStatus,
} from "../controllers/contest.controller.js";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { upload } from "../middlewares/multer.js";

const contestrouter = Router();

// ➤ Add Contest
contestrouter.post(
  "/add-contest",
  upload.single("contestImage"), // ✅ AFTER auth
  addContest
);

// ➤ Get All Contests (Admin)
contestrouter.get("/all-contests", verifyJWT, isAdmin, getAllContests);

// ➤ Get Contests (Student/User)
contestrouter.get("/stu-contest", verifyJWT, getAllContests);

// ➤ Update Contest Status
contestrouter.patch(
  "/update-status/:contestId",
  verifyJWT,
  isAdmin,
  updateContestStatus
);

// ➤ Update Contest Image
contestrouter.put(
  "/update-contest-image/:contestId",
  verifyJWT,
  isAdmin,
  upload.single("contestImage"),
  updateContestImage
);

// ➤ Delete Contest
contestrouter.delete(
  "/delete-contest/:contestId",
  verifyJWT,
  isAdmin,
  deleteContest
);

export default contestrouter;