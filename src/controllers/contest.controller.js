import { Contest } from "../models/contest.model.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";


// ✅ CREATE CONTEST
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
  if (
    !contestTitle ||
    !contestDescription ||
    !projectBriefing ||
    !category ||
    !projectType
  ) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // ✅ Validate projectType
  const validProjectType = ["Individual", "Team", "Both"];
  if (!validProjectType.includes(projectType)) {
    throw new ApiError(400, "Invalid project type");
  }

  // ✅ Duplicate title check
  const existingContest = await Contest.findOne({ contestTitle });
  if (existingContest) {
    throw new ApiError(409, "Contest already exists with this title");
  }

  // ✅ Team size validation
  if (
    (projectType === "Team" || projectType === "Both") &&
    (!teamSize || teamSize < 2)
  ) {
    throw new ApiError(
      400,
      "Team size must be at least 2 for team/both projects"
    );
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
    teamSize: projectType === "Individual" ? 1 : teamSize,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, contest, "Contest created successfully"));
});


// ➤ GET ALL CONTESTS
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


// ➤ UPDATE CONTEST
export const updateContestStatus = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  let { status, projectType, teamSize } = req.body;

  const validStatus = ["Upcoming", "On-Going", "Completed"];
  const validProjectType = ["Individual", "Team", "Both"];

  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  // ✅ Auto status update by deadline
  if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
    contest.status = "Completed";
  } else if (status) {
    if (!validStatus.includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }
    contest.status = status;
  }

  // ✅ Update projectType
  if (projectType) {
    if (!validProjectType.includes(projectType)) {
      throw new ApiError(400, "Invalid project type");
    }

    contest.projectType = projectType;

    // ✅ Handle teamSize properly
    if (projectType === "Team" || projectType === "Both") {
      if (!teamSize || teamSize < 2) {
        throw new ApiError(
          400,
          "Team size must be at least 2 for team/both projects"
        );
      }
      contest.teamSize = teamSize;
    } else {
      contest.teamSize = 1;
    }
  }

  await contest.save();

  return res
    .status(200)
    .json(new ApiResponse(200, contest, "Contest updated successfully"));
});


// ➤ DELETE CONTEST
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