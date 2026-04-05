import { deleteResult, getAllResults, getContestResults, getMyResult, getMyResultByContest, updateResult, uploadResults } from "../controllers/result.controller.js";
import { isAdmin } from "../middlewares/isAdmin.js";
import { verifyJWT } from "../middlewares/verifyJwt.js";
import express from "express"


const resultRouter=express.Router()
resultRouter.post("/upload", verifyJWT, isAdmin, uploadResults);

resultRouter.get("/all", verifyJWT, isAdmin, getAllResults);

resultRouter.get("/contest/:contestId", verifyJWT, getContestResults);

resultRouter.get("/my", verifyJWT, getMyResult);

resultRouter.get("/my/:contestId", verifyJWT, getMyResultByContest);

resultRouter.delete("/:resultId", verifyJWT, isAdmin, deleteResult);

resultRouter.patch("/:resultId", verifyJWT, isAdmin, updateResult);

export default resultRouter