import { Invite } from "../models/invite.model.js";
import { Team } from "../models/team.model.js";
import { User } from "../models/user.model.js";
import { Contest } from "../models/contest.model.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

// 🔥 Helper
const isValidStatus = (status) => {
  return ["Accepted", "Rejected"].includes(status);
};

// ✅ SEND INVITE
export const sendInvite = asyncHandler(async (req, res) => {
  const leaderEmail = req.user.email;
  const { teamId, invitedUserEmail } = req.body;

  const leader = await User.findOne({ email: leaderEmail });
  if (!leader) throw new ApiError(404, "User not found");

  const invitedUser = await User.findOne({ email: invitedUserEmail });
  if (!invitedUser) throw new ApiError(404, "User not found");

  if (leader._id.toString() === invitedUser._id.toString()) {
    throw new ApiError(400, "You cannot invite yourself");
  }

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  if (team.leader.toString() !== leader._id.toString()) {
    throw new ApiError(403, "Only leader can invite");
  }

  // ✅ Already in team
  if (team.members.some(id => id.toString() === invitedUser._id.toString())) {
    throw new ApiError(400, "User already in team");
  }

  const contest = await Contest.findById(team.contest);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (team.members.length >= contest.teamSize) {
    throw new ApiError(400, "Team is full");
  }

  // ✅ Prevent duplicate invite
  const existing = await Invite.findOne({
    team: teamId,
    receiver: invitedUser._id,
    status: "Pending",
    actionType: "INVITE"
  });

  if (existing) throw new ApiError(400, "Invite already sent");

  const invite = await Invite.create({
    team: teamId,
    contest: team.contest,
    actionType: "INVITE",
    sender: leader._id,
    receiver: invitedUser._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, invite, "Invite sent"));
});


// ✅ ACCEPT / REJECT INVITE
export const respondToInvite = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { inviteId, status } = req.body;

  if (!isValidStatus(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new ApiError(404, "User not found");

  const invite = await Invite.findById(inviteId);
  if (!invite) throw new ApiError(404, "Invite not found");

  if (invite.receiver.toString() !== user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (invite.status !== "Pending") {
    throw new ApiError(400, "Already responded");
  }

  const team = await Team.findById(invite.team);
  if (!team) throw new ApiError(404, "Team not found");

  const contest = await Contest.findById(team.contest);
  if (!contest) throw new ApiError(404, "Contest not found");

  // ❗ Check already in another team
  const existingTeam = await Team.findOne({
    contest: team.contest,
    members: user._id,
  });

  if (existingTeam) {
    throw new ApiError(400, "Already in another team");
  }

  invite.status = status;
  await invite.save();

  // ✅ If accepted → add to team
  if (status === "Accepted") {
    if (team.members.length >= contest.teamSize) {
      throw new ApiError(400, "Team is full");
    }

    if (!team.members.some(id => id.toString() === user._id.toString())) {
      team.members.push(user._id);
      await team.save();
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, invite, `Invite ${status}`));
});


// ✅ REQUEST TO JOIN
export const requestToJoin = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { teamId } = req.body;

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new ApiError(404, "User not found");

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  // ✅ Already in team
  if (team.members.some(id => id.toString() === user._id.toString())) {
    throw new ApiError(400, "Already in team");
  }

  const contest = await Contest.findById(team.contest);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (team.members.length >= contest.teamSize) {
    throw new ApiError(400, "Team is full");
  }

  // ❗ Already in another team
  const existingTeam = await Team.findOne({
    contest: team.contest,
    members: user._id,
  });

  if (existingTeam) {
    throw new ApiError(400, "Already in another team");
  }

  // ❗ Prevent duplicate request
  const existing = await Invite.findOne({
    team: teamId,
    sender: user._id,
    actionType: "JOIN_REQUEST",
    status: "Pending",
  });

  if (existing) throw new ApiError(400, "Already requested");

  const invite = await Invite.create({
    team: teamId,
    contest: team.contest,
    actionType: "JOIN_REQUEST",
    sender: user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, invite, "Request sent"));
});


// ✅ LEADER ACCEPT / REJECT REQUEST
export const respondToJoinRequest = asyncHandler(async (req, res) => {
  const leaderEmail = req.user.email;
  const { inviteId, status } = req.body;

  if (!isValidStatus(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const leader = await User.findOne({ email: leaderEmail });
  if (!leader) throw new ApiError(404, "User not found");

  const invite = await Invite.findById(inviteId);
  if (!invite) throw new ApiError(404, "Request not found");

  const team = await Team.findById(invite.team);
  if (!team) throw new ApiError(404, "Team not found");

  if (team.leader.toString() !== leader._id.toString()) {
    throw new ApiError(403, "Only leader allowed");
  }

  if (invite.status !== "Pending") {
    throw new ApiError(400, "Already responded");
  }

  const contest = await Contest.findById(team.contest);
  if (!contest) throw new ApiError(404, "Contest not found");

  // ❗ Already in another team
  const existingTeam = await Team.findOne({
    contest: team.contest,
    members: invite.sender,
  });

  if (existingTeam) {
    throw new ApiError(400, "User already in another team");
  }

  invite.status = status;
  await invite.save();

  if (status === "Accepted") {
    if (team.members.length >= contest.teamSize) {
      throw new ApiError(400, "Team is full");
    }

    if (!team.members.some(id => id.toString() === invite.sender.toString())) {
      team.members.push(invite.sender);
      await team.save();
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, invite, `Request ${status}`));
});


// ✅ GET MY INVITES
export const getMyInvites = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  if (!user) throw new ApiError(404, "User not found");

  const invites = await Invite.find({
    receiver: user._id,
    actionType: "INVITE",
    status: "Pending",
  }).populate("team sender", "teamName userName email");

  return res
    .status(200)
    .json(new ApiResponse(200, invites, "Invites fetched"));
});


// ✅ GET MY REQUESTS
export const getMyRequests = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  if (!user) throw new ApiError(404, "User not found");

  const requests = await Invite.find({
    sender: user._id,
    actionType: "JOIN_REQUEST",
  }).populate("team");

  return res
    .status(200)
    .json(new ApiResponse(200, requests, "Requests fetched"));
});


// ✅ ADMIN: VIEW ALL INVITES
export const getAllInvites = asyncHandler(async (req, res) => {
  const { status, actionType, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (actionType) filter.actionType = actionType;

  const skip = (page - 1) * limit;

  const invites = await Invite.find(filter)
    .populate("team", "teamName")
    .populate("sender", "userName email")
    .populate("receiver", "userName email")
    .populate("contest", "contestTitle")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Invite.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      invites,
    }, "All invites fetched")
  );
});


// ✅ ADMIN: GET SINGLE INVITE
export const getInviteById = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;

  const invite = await Invite.findById(inviteId)
    .populate("team", "teamName")
    .populate("sender", "userName email")
    .populate("receiver", "userName email")
    .populate("contest", "contestTitle");

  if (!invite) throw new ApiError(404, "Invite not found");

  return res
    .status(200)
    .json(new ApiResponse(200, invite, "Invite fetched"));
});


// ✅ ADMIN: DELETE INVITE
export const deleteInvite = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;

  const invite = await Invite.findById(inviteId);
  if (!invite) throw new ApiError(404, "Invite not found");

  await invite.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Invite deleted successfully"));
});