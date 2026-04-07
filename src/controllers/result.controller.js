import { Contest } from "../models/contest.model.js";
import { Team } from "../models/team.model.js";
import { Result } from "../models/result.schema.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

// ✅ Upload Results (TEAM BASED)
export const uploadResults = asyncHandler(async (req, res) => {
  const { contestId, results } = req.body;

  if (!contestId || !results || results.length === 0) {
    throw new ApiError(400, "Contest and results are required");
  }

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  const createdResults = [];

  for (const item of results) {
    const { teamId, rank, score, remarks } = item;

    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, `Team not found: ${teamId}`);
    }

    // ✅ Ensure team belongs to same contest
    if (team.contest.toString() !== contestId) {
      throw new ApiError(400, "Team does not belong to this contest");
    }

    // ✅ Prevent duplicate result
    const existing = await Result.findOne({
      team: teamId,
      contest: contestId,
    });

    if (existing) {
      throw new ApiError(400, "Result already exists for this team");
    }

    const result = await Result.create({
      contest: contestId,
      team: teamId,
      rank,
      score,
      remarks,
    });

    createdResults.push(result);
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdResults, "Results uploaded successfully"));
});

// ✅ GET ALL RESULTS
export const getAllResults = asyncHandler(async (req, res) => {
  const results = await Result.find()
    .populate("team")
    .populate("contest", "contestTitle status");

  return res
    .status(200)
    .json(new ApiResponse(200, results, "All results fetched successfully"));
});

// ✅ GET CONTEST RESULTS
export const getContestResults = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  const results = await Result.find({ contest: contestId })
    .populate("team")
    .sort({ score: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Contest results fetched"));
});

// ✅ GET MY RESULT (TEAM BASED)
export const getMyResult = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const results = await Result.find()
    .populate({
      path: "team",
      match: { members: userId }, // 🔥 important
    })
    .populate("contest", "contestTitle status");

  const filtered = results.filter(r => r.team !== null);

  return res
    .status(200)
    .json(new ApiResponse(200, filtered, "My results fetched"));
});

// ✅ GET MY RESULT BY CONTEST
export const getMyResultByContest = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const userId = req.user._id;

  const result = await Result.findOne({ contest: contestId })
    .populate({
      path: "team",
      match: { members: userId },
    })
    .populate("contest", "contestTitle");

  if (!result || !result.team) {
    throw new ApiError(404, "Result not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Result fetched successfully"));
});

// ✅ UPDATE RESULT
export const updateResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const { rank, score, remarks } = req.body;

  const result = await Result.findById(resultId);
  if (!result) throw new ApiError(404, "Result not found");

  if (rank) result.rank = rank;
  if (score !== undefined) result.score = score;
  if (remarks) result.remarks = remarks;

  await result.save();

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Result updated successfully"));
});

// ✅ DELETE RESULT
export const deleteResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;

  const result = await Result.findById(resultId);
  if (!result) throw new ApiError(404, "Result not found");

  await result.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Result deleted successfully"));
});