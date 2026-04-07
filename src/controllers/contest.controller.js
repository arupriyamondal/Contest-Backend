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
    entryLimit,
    projectType,
    teamSize,
  } = req.body;

  // ✅ Required fields
  if (!contestTitle || !contestDescription || !projectBriefing || !category || !projectType) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // ✅ Duplicate title check
  const existingContest = await Contest.findOne({ contestTitle });
  if (existingContest) {
    throw new ApiError(409, "Contest already exists with this title");
  }

  // ✅ Team size validation
  if (projectType === "Team" && (!teamSize || teamSize < 2)) {
    throw new ApiError(400, "Team size must be at least 2 for team projects");
  }

  const contest = await Contest.create({
    contestTitle,
    contestDescription,
    projectBriefing,
    contestDeadLine,
    status,
    category,
    entryLimit,
    projectType,
    teamSize: projectType === "Team" ? teamSize : 1,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, contest, "Contest created successfully"));
});
// ➤ Get All Contests + Total Count
export const getAllContests = asyncHandler(async (req, res) => {
  const contests = await Contest.find().sort({ createdAt: -1 });

  // ✅ Auto अपडेट status
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
    }),
  );

  const total = await Contest.countDocuments();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        contests: updatedContests,
      },
      "All contests fetched successfully",
    ),
  );
});

// ➤ Update Contest Status (with auto deadline check)
export const updateContestStatus = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  let { status, projectType, teamSize } = req.body;

  const validStatus = ["Upcoming", "On-Going", "Completed"];
  const validProjectType = ["Individual", "Team"];

  // ✅ Find contest first
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  // ✅ Update status (auto based on deadline)
  if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
    contest.status = "Completed";
  } else if (status) {
    if (!validStatus.includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }
    contest.status = status;
  }

  // ✅ Update projectType if provided
  if (projectType) {
    if (!validProjectType.includes(projectType)) {
      throw new ApiError(400, "Invalid project type");
    }
    contest.projectType = projectType;

    // ✅ If projectType is Team, validate teamSize
    if (projectType === "Team") {
      if (!teamSize || teamSize < 2) {
        throw new ApiError(400, "Team size must be at least 2 for team projects");
      }
      contest.teamSize = teamSize;
    } else {
      // Individual project → set teamSize = 1
      contest.teamSize = 1;
    }
  }

  await contest.save();

  return res
    .status(200)
    .json(new ApiResponse(200, contest, "Contest updated successfully"));
});

export const deleteContest = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  const contest = await Contest.findById(contestId);

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  await Contest.deleteOne({ _id: contestId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Contest deleted successfully"));
});