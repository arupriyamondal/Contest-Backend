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
    ruleSections, // ✅ NEW
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

  // ✅ IMAGE
  let contestImageData = { url: "", public_id: "" };

  if (req.files?.image) {
    try {
      const uploadedImage = await cloudinary.uploader.upload(
        req.files.image[0].path,
        { folder: "contest_images" }
      );

      contestImageData = {
        url: uploadedImage.secure_url,
        public_id: uploadedImage.public_id,
      };
    } finally {
      fs.unlinkSync(req.files.image[0].path);
    }
  }

  // ✅ PDF UPLOAD
  let contestPDFData = { url: "", public_id: "", fileName: "" };

  if (req.files?.pdf) {
    try {
      const uploadedPDF = await cloudinary.uploader.upload(
        req.files.pdf[0].path,
        {
          resource_type: "raw", // ⚠️ IMPORTANT
          folder: "contest_pdfs",
        }
      );

      contestPDFData = {
        url: uploadedPDF.secure_url,
        public_id: uploadedPDF.public_id,
        fileName: req.files.pdf[0].originalname,
      };
    } finally {
      fs.unlinkSync(req.files.pdf[0].path);
    }
  }

  // ✅ PARSE RULE SECTIONS (important for Postman/form-data)
  let parsedRules = [];
  if (ruleSections) {
    try {
      parsedRules =
        typeof ruleSections === "string"
          ? JSON.parse(ruleSections)
          : ruleSections;
    } catch {
      throw new ApiError(400, "Invalid ruleSections format");
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
    contestPDF: contestPDFData,
    ruleSections: parsedRules,
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
      if (
        c.contestDeadLine &&
        new Date() > c.contestDeadLine &&
        c.status !== "Completed"
      ) {
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


// ✅ UPDATE STATUS + RULES
export const updateContestStatus = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const { status, projectType, teamSize, ruleSections } = req.body;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (status) contest.status = status;

  if (projectType) {
    contest.projectType = projectType;
    contest.teamSize =
      projectType === "Individual" ? 1 : teamSize || contest.teamSize;
  }

  // ✅ UPDATE RULE SECTIONS
  if (ruleSections) {
    try {
      contest.ruleSections =
        typeof ruleSections === "string"
          ? JSON.parse(ruleSections)
          : ruleSections;
    } catch {
      throw new ApiError(400, "Invalid ruleSections format");
    }
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
    fs.unlinkSync(req.file.path);
  }

  contest.contestImage = newImage;
  await contest.save();

  return res
    .status(200)
    .json(new ApiResponse(200, contest, "Image updated"));
});


// ✅ UPDATE PDF
export const updateContestPDF = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  if (!req.file) throw new ApiError(400, "PDF required");

  let newPDF;

  try {
    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "raw",
      folder: "contest_pdfs",
    });

    newPDF = {
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
      fileName: req.file.originalname,
    };

    if (contest.contestPDF?.public_id) {
      await cloudinary.uploader.destroy(contest.contestPDF.public_id, {
        resource_type: "raw",
      });
    }
  } finally {
    fs.unlinkSync(req.file.path);
  }

  contest.contestPDF = newPDF;
  await contest.save();

  return res
    .status(200)
    .json(new ApiResponse(200, contest, "PDF updated"));
});


// ✅ DELETE CONTEST
export const deleteContest = asyncHandler(async (req, res) => {
  const { contestId } = req.params;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  // ✅ Delete image
  if (contest.contestImage?.public_id) {
    await cloudinary.uploader.destroy(contest.contestImage.public_id);
  }

  // ✅ Delete PDF
  if (contest.contestPDF?.public_id) {
    await cloudinary.uploader.destroy(contest.contestPDF.public_id, {
      resource_type: "raw",
    });
  }

  await Contest.deleteOne({ _id: contestId });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Contest deleted"));
});