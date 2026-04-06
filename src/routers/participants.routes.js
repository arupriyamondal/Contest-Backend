import { Router } from "express";

import { verifyJWT } from "../middlewares/verifyJwt.js";
import { addParticipant, deleteParticipant, getAllParticipants, submitProject } from "../controllers/participants.controller.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const participantrouter = Router();

participantrouter.post("/join", verifyJWT, addParticipant);
participantrouter.put("/submit", verifyJWT, submitProject);
participantrouter.get("/all",verifyJWT, getAllParticipants);
participantrouter.delete("/delete-participate",verifyJWT,isAdmin,deleteParticipant)

export default participantrouter;