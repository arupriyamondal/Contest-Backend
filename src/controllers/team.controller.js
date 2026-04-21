import { Contest } from "../models/contest.model.js";
import { Invite } from "../models/invite.model.js";
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

  // ❗ REMOVED BLOCK: Allow Individual participation in createTeam flow
  /*
  if (contest.projectType === "Individual") {
    throw new ApiError(400, "This contest only allows individual participation");
  }
  */

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new ApiError(404, "User not found");

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

// ✅ REQUEST TO JOIN


// ✅ GET MY TEAM
// ✅ GET MY TEAM (Updated)
export const getMyTeam = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { contestId } = req.params;

  const user = await User.findOne({ email: userEmail });

  const team = await Team.findOne({
    contest: contestId,
    members: user._id,
  })
    .populate("members", "userName email")
    .populate("leader", "userName email");

  if (!team) {
    return res.status(200).json(new ApiResponse(200, null, "No team found"));
  }

  // 🔥 Fetch join requests for this team
  const joinRequests = await Invite.find({
    team: team._id,
    actionType: "JOIN_REQUEST",
    status: "Pending"
  }).populate("sender", "userName email");

  const teamData = {
    ...team.toObject(),
    joinRequests
  };

  return res.status(200).json(
    new ApiResponse(200, teamData, "Team fetched")
  );
});

// ✅ GET TEAM DETAILS
export const getTeamDetails = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await Team.findById(teamId)
    .populate("members", "userName email")
    .populate("leader", "userName email");

  if (!team) throw new ApiError(404, "Team not found");

  // 🔥 Fetch join requests for this team
  const joinRequests = await Invite.find({
    team: team._id,
    actionType: "JOIN_REQUEST",
    status: "Pending"
  }).populate("sender", "userName email");

  const teamData = {
    ...team.toObject(),
    joinRequests
  };

  return res
    .status(200)
    .json(new ApiResponse(200, teamData, "Team details fetched"));
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

  // 🔥 delete related invites
  await Invite.deleteMany({ team: teamId });

  await team.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Team deleted successfully"));
});

// ✅ ADD SUBMISSION
export const addSubmission = asyncHandler(async (req, res) => {
  const userEmail = req.user.email;
  const { teamId, link, contestId } = req.body;

  if (!link) {
    throw new ApiError(400, "Submission link is required");
  }

  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ============================
  // ✅ CASE 1: TEAM SUBMISSION
  // ============================
  if (teamId) {
    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    const contest = await Contest.findById(team.contest);
    if (!contest) throw new ApiError(404, "Contest not found");

    // ✅ Allow both Team and Individual submissions through the team flow
    /* 
    if (contest.projectType === "Individual") {
      throw new ApiError(400, "Team submission not allowed for this contest");
    }
    */

    // ✅ Check membership
    const isMember = team.members.some(
      (id) => id.toString() === user._id.toString()
    );

    if (!isMember) {
      throw new ApiError(403, "Only team members can submit");
    }

    // ✅ Flexible team size check based on project type
    const currentTeamSize = team.members.length;
    const requiredTeamSize = Number(contest.teamSize);

    if (contest.projectType === "Individual") {
      if (currentTeamSize !== 1) {
        throw new ApiError(400, "Individual participation only allows 1 member");
      }
    } else if (contest.projectType === "Team") {
      if (currentTeamSize !== requiredTeamSize) {
        throw new ApiError(400, `Team must have exactly ${requiredTeamSize} members`);
      }
    } else if (contest.projectType === "Both") {
      if (currentTeamSize !== 1 && currentTeamSize !== requiredTeamSize) {
        throw new ApiError(400, `Submission must be Solo or a Team of exactly ${requiredTeamSize} members`);
      }
    }

    // ❌ Already submitted
    if (team.submissionStatus === "Submitted") {
      throw new ApiError(400, "Team already submitted");
    }

    // ❌ Not approved
    if (team.approvalStatus !== "Approved") {
      throw new ApiError(403, "Team not approved yet");
    }

    // ✅ Save submission
    team.submissionLink = link;
    team.submissionStatus = "Submitted";

    await team.save();

    return res.status(200).json(
      new ApiResponse(200, team, "Team submission successful")
    );
  }

  // ===============================
  // ✅ CASE 2: INDIVIDUAL SUBMISSION
  // ===============================
  else {
    if (!contestId) {
      throw new ApiError(400, "contestId is required for individual submission");
    }

    const contest = await Contest.findById(contestId);
    if (!contest) throw new ApiError(404, "Contest not found");

    // ❌ Block if only Team allowed
    if (contest.projectType === "Team") {
      throw new ApiError(400, "Individual submission not allowed for this contest");
    }

    // ❌ Check if already submitted individually
    const existingIndividual = await Team.findOne({
      contest: contest._id,
      leader: user._id,
      members: { $size: 1 }, // 👈 important (only individual)
      submissionStatus: "Submitted",
    });

    if (existingIndividual) {
      throw new ApiError(400, "Already submitted individually");
    }

    // ❌ Optional: Prevent submitting both team + individual (REMOVE if you want both allowed)
    /*
    const existingTeamSubmission = await Team.findOne({
      contest: contest._id,
      members: user._id,
      submissionStatus: "Submitted",
    });

    if (existingTeamSubmission) {
      throw new ApiError(400, "Already submitted as part of a team");
    }
    */

    // ✅ Create "virtual team" for individual
    const team = await Team.create({
      teamName: `${user.userName}-individual`,
      contest: contest._id,
      leader: user._id,
      members: [user._id],
      submissionLink: link,
      submissionStatus: "Submitted",
      approvalStatus: "Approved",
    });

    return res.status(200).json(
      new ApiResponse(200, team, "Individual submission successful")
    );
  }
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
  await Invite.deleteMany({ team: teamId });
  await team.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Team deleted successfully"));
});

export const getUserParticipatedContests = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // 🔍 Find teams where user is leader or member
  const teams = await Team.find({
    $or: [
      { leader: userId },
      { members: userId }
    ],
  })
    .populate("contest", "contestTitle category status contestDeadLine")
    .select("teamName contest submissionStatus approvalStatus");

  if (!teams.length) {
    return res.status(200).json(
      new ApiResponse(200, [], "User has not participated in any contest")
    );
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalContests: teams.length,
        participatedContests: teams,
      },
      "User participated contests fetched successfully"
    )
  );
});
