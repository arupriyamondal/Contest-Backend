import { Contest } from "../models/contest.model.js";
import { Participation } from "../models/participate.contest.js";
import { User } from "../models/user.model.js";
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

  // ❌ Prevent joining after deadline
  if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
    throw new ApiError(400, "Contest deadline passed");
  }

  // ❌ Check entry limit
  const totalParticipants = await Participation.countDocuments({
    contest: contestId,
  });

  if (contest.entryLimit && totalParticipants >= contest.entryLimit) {
    throw new ApiError(400, "Contest entry limit reached");
  }

  // ❌ Prevent duplicate participation
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

  return res.status(201).json(
    new ApiResponse(201, participation, "Joined contest successfully")
  );
});


// ✅ 2. SUBMIT PROJECT
export const submitProject = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { contestId, submissionLink, description } = req.body;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  // 🔍 Find participation
  const participation = await Participation.findOne({
    user: userId,
    contest: contestId,
  });

  if (!participation) {
    throw new ApiError(404, "Participation not found");
  }

  // ❌ Check deadline
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

  return res.status(200).json(
    new ApiResponse(200, participation, "Project submitted successfully")
  );
});


// ✅ 3. VIEW ALL PARTICIPANTS
export const getAllParticipants = asyncHandler(async (req, res) => {
  const participants = await Participation.find()
    .populate("user", "userName email contact gender")
    .populate(
      "contest",
      "contestTitle contestDescription category status contestDeadLine"
    )
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total: participants.length,
        participants,
      },
      "Participants fetched successfully"
    )
  );
});


// ✅ 4. DELETE PARTICIPANT (Leave Contest)
export const deleteParticipant = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { contestId } = req.body;

  if (!contestId) {
    throw new ApiError(400, "Contest ID is required");
  }

  // 🔍 Find participation
  const participation = await Participation.findOne({
    user: userId,
    contest: contestId,
  });

  if (!participation) {
    throw new ApiError(404, "Participation not found");
  }

  // ❌ Prevent delete after submission
  if (participation.submissionStatus === "Submitted") {
    throw new ApiError(400, "Cannot delete after project submission");
  }

  // ✅ Delete
  await Participation.deleteOne({ _id: participation._id });

  return res.status(200).json(
    new ApiResponse(200, null, "Participation deleted successfully")
  );
});