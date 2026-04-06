import { Contest } from "../models/contest.model.js";
import { Participation } from "../models/participate.contest.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";



// ✅ 1. ADD PARTICIPANT (Join Contest)
export const addParticipant = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { contestId } = req.body;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  // 🔍 Check contest exists
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  // ❌ Deadline check
  if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
    throw new ApiError(400, "Contest deadline passed");
  }

  // ❌ Entry limit check
  const totalParticipants = await Participation.countDocuments({
    contest: contestId,
  });

  if (contest.entryLimit && totalParticipants >= contest.entryLimit) {
    throw new ApiError(400, "Contest entry limit reached");
  }

  // ❌ Duplicate check
  const alreadyJoined = await Participation.findOne({
    user: userId,
    contest: contestId,
  });

  if (alreadyJoined) {
    throw new ApiError(400, "You already joined this contest");
  }

  // ✅ Create participation
  const participation = await Participation.create({
    user: userId,
    contest: contestId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, participation, "Joined contest successfully"));
});


// ✅ 2. SUBMIT PROJECT
export const submitProject = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { contestId, submissionLink, description } = req.body;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  const participation = await Participation.findOne({
    user: userId,
    contest: contestId,
  });

  if (!participation) {
    throw new ApiError(404, "Participation not found");
  }

  // ❌ Deadline check
  const contest = await Contest.findById(contestId);
  if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
    throw new ApiError(400, "Submission deadline passed");
  }

  // ✅ Update submission
  participation.submissionLink = submissionLink;
  participation.description = description;
  participation.submissionStatus = "Submitted";
  participation.submittedAt = new Date();

  await participation.save();

  return res
    .status(200)
    .json(new ApiResponse(200, participation, "Project submitted successfully"));
});


// ✅ 3. USER → VIEW THEIR PARTICIPATIONS
export const getAllParticipants = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const participants = await Participation.find({ user: userId })
    .populate(
      "contest",
      "contestTitle contestDescription category status contestDeadLine"
    )
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, {
      total: participants.length,
      data: participants,
    })
  );
});


// ✅ 4. ADMIN → VIEW ALL PARTICIPANTS
export const getAllParticipantsAdmin = asyncHandler(async (req, res) => {
  const participants = await Participation.find()
    .populate("user", "userName email contact gender")
    .populate(
      "contest",
      "contestTitle contestDescription category status contestDeadLine"
    )
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, {
      total: participants.length,
      data: participants,
    })
  );
});


// ✅ 5. ADMIN → DELETE PARTICIPANT
export const deleteParticipantAdmin = asyncHandler(async (req, res) => {
  const { participationId } = req.params;

  if (!participationId) {
    throw new ApiError(400, "Participation ID is required");
  }

  const participation = await Participation.findById(participationId);

  if (!participation) {
    throw new ApiError(404, "Participation not found");
  }

  await Participation.deleteOne({ _id: participationId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Participation deleted successfully"));
});