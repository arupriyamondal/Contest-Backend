import cloudinary from "../config/cloudinary.js";
import { Contest } from "../models/contest.model.js";
import ApiError from "../utils/apierror.js";
import ApiResponse from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";
import fs from "fs";

// ✅ CREATE CONTEST
export const addContest = asyncHandler(async (req, res) => {
  const {
    contestTitle,
    contestDescription,
    projectBriefing,
    contestDeadLine,
    status,
    category,
    entryLimit,
    projectType,
    teamSize,
  } = req.body;

  if (
    !contestTitle ||
    !contestDescription ||
    !projectBriefing ||
    !category ||
    !projectType
  ) {
    throw new ApiError(400, "All required fields must be provided");
  }

  const validProjectType = ["Individual", "Team", "Both"];
  if (!validProjectType.includes(projectType)) {
    throw new ApiError(400, "Invalid project type");
  }

  const existingContest = await Contest.findOne({ contestTitle });
  if (existingContest) {
    throw new ApiError(409, "Contest already exists");
  }

  if (
    (projectType === "Team" || projectType === "Both") &&
    (!teamSize || teamSize < 2)
  ) {
    throw new ApiError(400, "Team size must be at least 2");
  }

  let contestImageData = { url: "", public_id: "" };

  if (req.file) {
    try {
      const uploadedImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "contest_images",
      });

      contestImageData = {
        url: uploadedImage.secure_url,
        public_id: uploadedImage.public_id,
      };
    } finally {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
  }

  const contest = await Contest.create({
    contestTitle,
    contestDescription,
    projectBriefing,
    contestDeadLine,
    status,
    category,
    entryLimit,
    projectType,
    teamSize: projectType === "Individual" ? 1 : teamSize,
    contestImage: contestImageData,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, contest, "Contest created"));
});

// ✅ GET ALL
export const getAllContests = asyncHandler(async (req, res) => {
  const contests = await Contest.find().sort({ createdAt: -1 });

  const updated = await Promise.all(
    contests.map(async (c) => {
      if (c.contestDeadLine && new Date() > c.contestDeadLine && c.status !== "Completed") {
        c.status = "Completed";
        await c.save();
      }
      return c;
    })
  );

  return res.status(200).json(
    new ApiResponse(200, {
      total: updated.length,
      contests: updated,
    })
  );
});

// ✅ UPDATE STATUS
export const updateContestStatus = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const { status, projectType, teamSize } = req.body;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (status) contest.status = status;

  if (projectType) {
    contest.projectType = projectType;
    contest.teamSize =
      projectType === "Individual" ? 1 : teamSize || contest.teamSize;
  }

  await contest.save();

  return res
    .status(200)
    .json(new ApiResponse(200, contest, "Updated"));
});

// ✅ UPDATE IMAGE
export const updateContestImage = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (!req.file) throw new ApiError(400, "Image required");

  let newImage;

  try {
    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      folder: "contest_images",
    });

    newImage = {
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };

    if (contest.contestImage?.public_id) {
      await cloudinary.uploader.destroy(contest.contestImage.public_id);
    }
  } finally {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }

  contest.contestImage = newImage;
  await contest.save();

  return res
    .status(200)
    .json(new ApiResponse(200, contest, "Image updated"));
});

// ✅ DELETE CONTEST (FIXED 🔥)
export const deleteContest = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  // ✅ Delete image from Cloudinary
  if (contest.contestImage?.public_id) {
    await cloudinary.uploader.destroy(contest.contestImage.public_id);
  }

  await Contest.deleteOne({ _id: contestId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Contest deleted"));
});