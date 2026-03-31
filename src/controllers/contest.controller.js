
import { Contest } from "../models/contest.model.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

export const addContest = asyncHandler(async (req, res) => {
  const {
    contestTitle,
    contestDescription,
    projectBriefing,
    contestDeadLine,
    status,
    category,
    entryLimit
  } = req.body;

  // ✅ Required fields validation
  if (!contestTitle || !contestDescription || !projectBriefing || !category) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // ✅ Check duplicate contest title
  const existingContest = await Contest.findOne({ contestTitle });

  if (existingContest) {
    throw new ApiError(409, "Contest already exists with this title");
  }

  // ✅ Create contest
  const contest = await Contest.create({
    contestTitle,
    contestDescription,
    projectBriefing,
    contestDeadLine,
    status,
    category,
    entryLimit
  });

  return res.status(201).json(
    new ApiResponse(201, contest, "Contest created successfully")
  );
});


// ➤ Get All Contests + Total Count
export const getAllContests = asyncHandler(async (req, res) => {
  const contests = await Contest.find().sort({ createdAt: -1 });

  const total = await Contest.countDocuments();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        contests,
      },
      "All contests fetched successfully"
    )
  );
});