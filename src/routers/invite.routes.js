import { Router } from "express";
import {
  sendInvite,
  respondToInvite,
  requestToJoin,
  respondToJoinRequest,
  getMyInvites,
  getMyRequests,
  getAllInvites,
  getInviteById,
  deleteInvite,
} from "../controllers/invite.controller.js";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const inviterouter = Router();

// ✅ All routes are protected
inviterouter.use(verifyJWT);

// 🔥 Invite routes
inviterouter.post("/send", sendInvite);                     // Leader sends invite
inviterouter.post("/respond-invite", respondToInvite);      // Accept/Reject invite

// 🔥 Join request routes
inviterouter.post("/request", requestToJoin);               // User requests to join
inviterouter.post("/respond-request", respondToJoinRequest);// Leader accepts/rejects request

// 🔥 Fetch
inviterouter.get("/my-invites", getMyInvites);              // Logged-in user's invites
inviterouter.get("/my-requests", getMyRequests);

inviterouter.get("/view-invite", isAdmin,getAllInvites);              // View all invites
inviterouter.get("/admin/:inviteId", isAdmin, getInviteById);    // View single invite
inviterouter.delete("/delete-invite/:inviteId",isAdmin, deleteInvite);// Logged-in user's requests

export default inviterouter;