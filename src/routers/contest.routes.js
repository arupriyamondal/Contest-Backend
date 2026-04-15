import { Router } from "express";
import {
  addContest,
  deleteContest,
  getAllContests,
  updateContestImage,
  updateContestStatus,
  updateContestPDF, // ✅ NEW
} from "../controllers/contest.controller.js";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { upload } from "../middlewares/multer.js";

const contestrouter = Router();


// ➤ Add Contest (Image + PDF + ruleSections)
contestrouter.post(
  "/add-contest",
  upload.fields([
    { name: "image", maxCount: 1 }, // ✅ match controller
    { name: "pdf", maxCount: 1 },   // ✅ NEW
  ]),
  addContest
);


// ➤ Get All Contests (Admin)
contestrouter.get(
  "/all-contests",
  verifyJWT,
  isAdmin,
  getAllContests
);


// ➤ Get Contests (Student/User)
contestrouter.get(
  "/stu-contest",
  getAllContests
);


// ➤ Update Contest Status + Rule Sections
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


// ➤ ✅ NEW: Update Contest PDF
contestrouter.put(
  "/update-contest-pdf/:contestId",
  verifyJWT,
  isAdmin,
  upload.single("pdf"),
  updateContestPDF
);


// ➤ Delete Contest
contestrouter.delete(
  "/delete-contest/:contestId",
  verifyJWT,
  isAdmin,
  deleteContest
);

export default contestrouter;