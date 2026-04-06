import { Router } from "express";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { addParticipant, deleteParticipantAdmin, getAllParticipants, getAllParticipantsAdmin, submitProject } from "../controllers/participants.controller.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const participantrouter = Router();

participantrouter.post("/join", verifyJWT, addParticipant);
participantrouter.put("/submit", verifyJWT, submitProject);
participantrouter.get("/all",verifyJWT, getAllParticipants);
participantrouter.get("/admin/all", verifyJWT, isAdmin, getAllParticipantsAdmin);

// 🔥 Admin: delete any participation
participantrouter.delete("/admin/delete/:participationId", verifyJWT, isAdmin, deleteParticipantAdmin);

export default participantrouter;