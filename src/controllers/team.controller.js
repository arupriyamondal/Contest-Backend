import { Contest } from "../models/contest.model.js";
import { Team } from "../models/team.model.js";
import { User } from "../models/user.model.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

// 🔥 Helper
const isUserActiveInContest = (team, contest) => {
  return (
    team.submissionStatus !== "Submitted" &&
    (!contest.contestDeadLine || new Date() <= contest.contestDeadLine)
  );
};

// ✅ CREATE TEAM
export const createTeam = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { teamName, contestId } = req.body;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  const user = await User.findOne({ email: userEmail });

  const existingTeam = await Team.findOne({
    contest: contestId,
    members: user._id,
  });

  if (existingTeam && isUserActiveInContest(existingTeam, contest)) {
    throw new ApiError(400, "You are already participating in this contest");
  }

  const team = await Team.create({
    teamName,
    contest: contestId,
    leader: user._id,
    members: [user._id],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, team, "Team created successfully"));
});

// ✅ INVITE USER
export const inviteUser = asyncHandler(async (req, res) => {
  const leaderEmail = req.user.email;
  const { teamId, invitedUserEmail } = req.body;

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  const leader = await User.findOne({ email: leaderEmail });
  if (team.leader.toString() !== leader._id.toString()) {
    throw new ApiError(403, "Only leader can invite");
  }

  const invitedUser = await User.findOne({ email: invitedUserEmail });
  if (!invitedUser) throw new ApiError(404, "User not found");

  if (team.members.includes(invitedUser._id)) {
    throw new ApiError(400, "User already in team");
  }

  if (team.invitedUsers.includes(invitedUser._id)) {
    throw new ApiError(400, "User already invited");
  }

  const contest = await Contest.findById(team.contest);
  if (team.members.length >= contest.teamSize) {
    throw new ApiError(400, "Team is full");
  }

  team.invitedUsers.push(invitedUser._id);
  await team.save();

  return res
    .status(200)
    .json(new ApiResponse(200, team, `Invitation sent to ${invitedUserEmail}`));
});

// ✅ ACCEPT INVITE
export const acceptInvite = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { teamId } = req.body;

  const user = await User.findOne({ email: userEmail });
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  if (!team.invitedUsers.includes(user._id)) {
    throw new ApiError(400, "No invite found");
  }

  const contest = await Contest.findById(team.contest);
  if (team.members.length >= contest.teamSize) {
    throw new ApiError(400, "Team is full");
  }

  const existingTeam = await Team.findOne({
    contest: team.contest,
    members: user._id,
  });

  if (existingTeam && isUserActiveInContest(existingTeam, contest)) {
    throw new ApiError(400, "Already in another active team");
  }

  team.members.push(user._id);
  team.invitedUsers = team.invitedUsers.filter(
    (id) => id.toString() !== user._id.toString(),
  );

  await team.save();

  return res.status(200).json(new ApiResponse(200, team, "Joined via invite"));
});


export const rejectInvite = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { teamId } = req.body;

  // 🔍 Find user
  const user = await User.findOne({ email: userEmail });
  if (!user) throw new ApiError(404, "User not found");

  // 🔍 Find team
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  // ❗ Check if user is invited
  if (!team.invitedUsers.some(id => id.toString() === user._id.toString())) {
    throw new ApiError(400, "No invite found");
  }

  // ✅ Remove user from invited list (REJECT ACTION)
  team.invitedUsers = team.invitedUsers.filter(
    (id) => id.toString() !== user._id.toString()
  );

  await team.save();

  return res.status(200).json(
    new ApiResponse(200, team, "Invite rejected successfully")
  );
});
// ✅ REQUEST TO JOIN
export const requestToJoin = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { teamId } = req.body;

  const user = await User.findOne({ email: userEmail });
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  if (team.members.includes(user._id)) {
    throw new ApiError(400, "Already in team");
  }

  const contest = await Contest.findById(team.contest);

  const existingTeam = await Team.findOne({
    contest: team.contest,
    members: user._id,
  });

  if (existingTeam && isUserActiveInContest(existingTeam, contest)) {
    throw new ApiError(400, "Already participating in another team");
  }

  const alreadyRequested = team.joinRequests.find(
    (r) => r.user.toString() === user._id.toString(),
  );
  if (alreadyRequested) throw new ApiError(400, "Already requested");

  if (team.members.length >= contest.teamSize) {
    throw new ApiError(400, "Team is full");
  }

  team.joinRequests.push({ user: user._id });
  await team.save();

  return res.status(200).json(new ApiResponse(200, team, "Request sent"));
});

// ✅ ACCEPT REQUEST
export const acceptRequest = asyncHandler(async (req, res) => {
  const leaderEmail = req.user.email;
  const { teamId, requestUserEmail } = req.body;

  const leader = await User.findOne({ email: leaderEmail });
  const requestUser = await User.findOne({ email: requestUserEmail });

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  if (team.leader.toString() !== leader._id.toString()) {
    throw new ApiError(403, "Only leader can accept");
  }

  const contest = await Contest.findById(team.contest);

  if (team.members.length >= contest.teamSize) {
    throw new ApiError(400, "Team is full");
  }

  const requestExists = team.joinRequests.find(
    (r) => r.user.toString() === requestUser._id.toString(),
  );
  if (!requestExists) throw new ApiError(404, "Request not found");

  const existingTeam = await Team.findOne({
    contest: team.contest,
    members: requestUser._id,
  });

  if (existingTeam && isUserActiveInContest(existingTeam, contest)) {
    throw new ApiError(400, "User already in another active team");
  }

  team.members.push(requestUser._id);
  team.joinRequests = team.joinRequests.filter(
    (r) => r.user.toString() !== requestUser._id.toString(),
  );

  await team.save();

  return res.status(200).json(new ApiResponse(200, team, "Request accepted"));
});

// ✅ REJECT REQUEST
export const rejectRequest = asyncHandler(async (req, res) => {
  const leaderEmail = req.user.email;
  const { teamId, requestUserEmail } = req.body;

  const leader = await User.findOne({ email: leaderEmail });
  const requestUser = await User.findOne({ email: requestUserEmail });

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  if (team.leader.toString() !== leader._id.toString()) {
    throw new ApiError(403, "Only leader can reject");
  }

  team.joinRequests = team.joinRequests.filter(
    (r) => r.user.toString() !== requestUser._id.toString(),
  );

  await team.save();

  return res.status(200).json(new ApiResponse(200, team, "Request rejected"));
});

// ✅ GET MY TEAM
// ✅ GET MY TEAM (Updated)
export const getMyTeam = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { contestId } = req.params;

  const user = await User.findOne({ email: userEmail });

  // UPDATE THIS QUERY:
  const team = await Team.findOne({
    contest: contestId,
    $or: [
      { members: user._id },
      { invitedUsers: user._id }
    ]
  })
    .populate("members", "userName email")
    .populate("leader", "userName email");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        team || null,
        team ? "Team fetched" : "No team found",
      ),
    );
});
// ✅ GET TEAM DETAILS
export const getTeamDetails = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId)
    .populate("members", "userName email")
    .populate("leader", "userName email")
    .populate("joinRequests.user", "userName email");

  if (!team) throw new ApiError(404, "Team not found");

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Team details fetched"));
});

// ✅ VIEW ALL TEAMS
export const viewAllTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find()
    .populate("leader", "userName email")
    .populate("members", "userName email")
    .populate("contest", "contestTitle");

  return res.status(200).json(new ApiResponse(200, teams, "All teams fetched"));
});

// ✅ DELETE TEAM
export const deleteTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  await team.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Team deleted successfully"));
});

// ✅ ADD SUBMISSION
export const addSubmission = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { teamId, link } = req.body;

  if (!link) throw new ApiError(400, "Submission link is required");

  const user = await User.findOne({ email: userEmail });
  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  const contest = await Contest.findById(team.contest);

  // ✅ DEBUG (IMPORTANT)
  console.log("Members:", team.members.length);
  console.log("TeamSize:", contest?.teamSize);

  // ❗ FIX 1: Check contest exists
  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  // ❗ FIX 2: Convert teamSize to number
  const requiredSize = Number(contest.teamSize);

  // ❗ FIX 3: Proper comparison
  if (team.members.length !== requiredSize) {
    throw new ApiError(400, `Team must have exactly ${requiredSize} members`);
  }

  // ❗ FIX 4: Deadline check
  if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
    throw new ApiError(400, "Submission deadline is over");
  }

  // ❗ FIX 5: ObjectId comparison fix (VERY IMPORTANT)
  if (!team.members.some((id) => id.toString() === user._id.toString())) {
    throw new ApiError(403, "Only team members can submit");
  }

  // ❗ FIX 6: Prevent duplicate submission
  if (team.submissionStatus === "Submitted") {
    throw new ApiError(400, "Already submitted");
  }
  // ❗ Approval check
  if (team.approvalStatus !== "Approved") {
    throw new ApiError(403, "Team is not approved by admin");
  }

  // ✅ Save submission
  team.submissionLink = link;
  team.submissionStatus = "Submitted";

  await team.save();

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Submission added successfully"));
});

// ✅ UPDATE SUBMISSION STATUS
export const updateSubmissionStatus = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { status } = req.body;

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  if (status) team.submissionStatus = status;

  await team.save();

  return res
    .status(200)
    .json(new ApiResponse(200, team, "Submission status updated"));
});

// ✅ GET TEAM SUBMISSION
export const getTeamSubmissions = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        submissionLink: team.submissionLink,
        submissionStatus: team.submissionStatus,
      },
      "Submission fetched",
    ),
  );
});

// ✅ ADMIN APPROVAL
export const updateTeamApproval = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { status } = req.body; // Approved / Rejected

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  if (!["Approved", "Rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  team.approvalStatus = status;
  await team.save();

  return res.status(200).json(
    new ApiResponse(200, team, `Team ${status.toLowerCase()} successfully`)
  );
});

// ✅ DELETE TEAM (Leader Only - No Approval Restriction)
export const deleteTeamByUser = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userEmail = req.user.email;

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new ApiError(404, "User not found");

  const team = await Team.findById(teamId);
  if (!team) throw new ApiError(404, "Team not found");

  // ❗ Only leader can delete
  if (team.leader.toString() !== user._id.toString()) {
    throw new ApiError(403, "Only team leader can delete the team");
  }

  await team.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Team deleted successfully"));
});
