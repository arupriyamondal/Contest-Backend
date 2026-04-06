import { Router } from "express";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { addParticipant, getAllParticipants, submitProject } from "../controllers/participants.controller.js";

const participantrouter = Router();

participantrouter.post("/join", verifyJWT, addParticipant);
participantrouter.put("/submit", verifyJWT, submitProject);
participantrouter.get("/all",verifyJWT, getAllParticipants);

export default participantrouter;