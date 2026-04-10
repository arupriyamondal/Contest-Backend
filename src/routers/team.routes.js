import { Router } from "express";
import {
  createTeam,
  inviteUser,
  acceptInvite,
  requestToJoin,
  acceptRequest,
  rejectRequest,
  getMyTeam,
  getTeamDetails,
  viewAllTeams,
  deleteTeam,
  addSubmission,
  updateSubmissionStatus,
  getTeamSubmissions,
  rejectInvite,
  updateTeamApproval,
  deleteTeamByUser,
} from "../controllers/team.controller.js";

import { isAdmin } from "../middlewares/isAdmin.js";
import { verifyJWT } from "../middlewares/verifyJwt.js";

const teamRouter = Router();

// 🔐 All routes require login
teamRouter.use(verifyJWT);

// ✅ Create Team
teamRouter.post("/create-team", createTeam);

// ✅ Invite User (Leader only)
teamRouter.post("/invite-user", inviteUser);

// ✅ Accept Invite (Invited user)
teamRouter.post("/accept-invite", acceptInvite);

teamRouter.post("/reject-invite", verifyJWT, rejectInvite);

// ✅ Request to Join Team
teamRouter.post("/request-join", requestToJoin);

// ✅ Accept Join Request (Leader)
teamRouter.post("/accept-request", acceptRequest);

// ✅ Reject Join Request (Leader)
teamRouter.post("/reject-request", rejectRequest);

// ✅ Get My Team (by contest)
teamRouter.get("/my-team/:contestId", getMyTeam);

// ✅ Get Team Details
teamRouter.get("/team/:teamId", getTeamDetails);

// ✅ View All Teams (Admin)
teamRouter.get("/all-teams", isAdmin, viewAllTeams);

// ✅ Delete Team (Admin)
teamRouter.delete("/delete-team/:teamId", isAdmin, deleteTeam);

// ✅ Add Submission (Team member)
teamRouter.post("/add-submission", addSubmission);

// ✅ Update Submission Status (Admin)
teamRouter.patch("/update-submission/:teamId", isAdmin, updateSubmissionStatus);

// ✅ Get Submission of a Team
teamRouter.get("/submissions/:teamId", isAdmin, getTeamSubmissions);

teamRouter.get("/user-team",viewAllTeams)

teamRouter.patch("/approve-team/:teamId", isAdmin, updateTeamApproval);

teamRouter.delete("/delete/:teamId", isAdmin, deleteTeamByUser);

export default teamRouter;