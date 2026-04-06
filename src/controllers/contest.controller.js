import { Contest } from "../models/contest.model.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";


// ✅ 1. ADD CONTEST
export const addContest = asyncHandler(async (req, res) => {
  const {
    contestTitle,
    contestDescription,
    projectBriefing,
    contestDeadLine,
    status,
    category,
    entryLimit,
  } = req.body;

  // ✅ Required fields validation
  if (!contestTitle || !contestDescription || !projectBriefing || !category) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // ✅ Duplicate check
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
    entryLimit,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, contest, "Contest created successfully"));
});


// ✅ 2. GET ALL CONTESTS
export const getAllContests = asyncHandler(async (req, res) => {
  const contests = await Contest.find().sort({ createdAt: -1 });

  // ✅ Auto update status based on deadline
  const updatedContests = await Promise.all(
    contests.map(async (contest) => {
      if (
        contest.contestDeadLine &&
        new Date() > contest.contestDeadLine &&
        contest.status !== "Completed"
      ) {
        contest.status = "Completed";
        await contest.save();
      }
      return contest;
    })
  );

  const total = await Contest.countDocuments();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        contests: updatedContests,
      },
      "All contests fetched successfully"
    )
  );
});


// ✅ 3. UPDATE CONTEST STATUS
export const updateContestStatus = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  let { status } = req.body;

  const validStatus = ["Upcoming", "On-Going", "Completed"];

  const contest = await Contest.findById(contestId);

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  // ✅ Auto-complete if deadline passed
  if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
    contest.status = "Completed";
  } else {
    if (!status || !validStatus.includes(status)) {
      throw new ApiError(400, "Invalid or missing status value");
    }
    contest.status = status;
  }

  await contest.save();

  return res
    .status(200)
    .json(new ApiResponse(200, contest, "Contest status updated successfully"));
});


// ✅ 4. DELETE CONTEST
export const deleteContest = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  // 🔍 Find contest
  const contest = await Contest.findById(contestId);

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  // ❌ Optional: prevent delete if contest is ongoing
  if (contest.status === "On-Going") {
    throw new ApiError(400, "Cannot delete an ongoing contest");
  }

  // ✅ Delete contest
  await Contest.deleteOne({ _id: contestId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Contest deleted successfully"));
});