import { Contest } from "../models/contest.model.js";
import { Participation } from "../models/participate.contest.js";
import { Result } from "../models/result.schema.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

// ✅ Upload Results
export const uploadResults = asyncHandler(async (req, res) => {
  const { contestId, results } = req.body;

  if (!contestId || !results || results.length === 0) {
    throw new ApiError(400, "Contest and results are required");
  }

  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  const createdResults = [];

  for (const item of results) {
    const { userId, rank, score, remarks } = item;

    const participation = await Participation.findOne({
      user: userId,
      contest: contestId,
    });

    if (!participation) {
      throw new ApiError(404, `Participation not found for user ${userId}`);
    }

    // ✅ Prevent duplicate result
    const existing = await Result.findOne({
      user: userId,
      contest: contestId,
    });

    if (existing) {
      throw new ApiError(400, "Result already exists for this user");
    }

    const result = await Result.create({
      contest: contestId,
      user: userId,
      participation: participation._id,
      rank,
      score,
      remarks,
    });

    createdResults.push(result);
  }

  // ✅ USE ApiResponse here
  return res
    .status(201)
    .json(new ApiResponse(201, createdResults, "Results uploaded successfully"));
});

export const getAllResults = asyncHandler(async (req, res) => {
  const results = await Result.find()
    .populate("user", "userName email")
    .populate("contest", "contestTitle status")
    .populate("participation");

  return res
    .status(200)
    .json(new ApiResponse(200, results, "All results fetched successfully"));
});

export const getContestResults = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  const results = await Result.find({ contest: contestId })
    .populate("user", "userName email")
    .sort({ score: -1 }); // highest score first

  return res
    .status(200)
    .json(new ApiResponse(200, results, "Contest results fetched"));
});

export const getMyResult = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const results = await Result.find({ user: userId })
    .populate("contest", "contestTitle status")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, results, "My results fetched"));
});

export const getMyResultByContest = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const userId = req.user._id;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  const result = await Result.findOne({
    contest: contestId,
    user: userId,
  }).populate("contest", "contestTitle");

  if (!result) {
    throw new ApiError(404, "Result not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Result fetched successfully"));
});

export const updateResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const { rank, score, remarks } = req.body;

  const result = await Result.findById(resultId);

  if (!result) {
    throw new ApiError(404, "Result not found");
  }

  if (rank) result.rank = rank;
  if (score !== undefined) result.score = score;
  if (remarks) result.remarks = remarks;

  await result.save();

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Result updated successfully"));
});

export const deleteResult = asyncHandler(async (req, res) => {
  const { resultId } = req.params;

  const result = await Result.findById(resultId);

  if (!result) {
    throw new ApiError(404, "Result not found");
  }

  await result.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Result deleted successfully"));
});
