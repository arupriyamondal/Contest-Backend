import { Contest } from "../models/contest.model.js";
import { Participation } from "../models/participate.contest.js";
import { User } from "../models/user.model.js";

// ✅ 1. ADD PARTICIPANT (Join Contest)
export const addParticipant = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware
    const { contestId } = req.body;

    // 🔍 Check contest exists
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // ❌ Prevent joining after deadline
    if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
      return res.status(400).json({ message: "Contest deadline passed" });
    }

    // ❌ Check entry limit
    const totalParticipants = await Participation.countDocuments({
      contest: contestId,
    });

    if (contest.entryLimit && totalParticipants >= contest.entryLimit) {
      return res.status(400).json({
        message: "Contest entry limit reached",
      });
    }

    // ❌ Prevent duplicate participation
    const alreadyJoined = await Participation.findOne({
      user: userId,
      contest: contestId,
    });

    if (alreadyJoined) {
      return res.status(400).json({
        message: "You already joined this contest",
      });
    }

    // ✅ Create participation
    const participation = await Participation.create({
      user: userId,
      contest: contestId,
    });

    return res.status(201).json({
      message: "Joined contest successfully",
      data: participation,
    });
  } catch (error) {
    console.log("Add Participant Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 2. UPDATE PARTICIPANT (Submit Project)
export const submitProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contestId, submissionLink, description } = req.body;

    // 🔍 Find participation
    const participation = await Participation.findOne({
      user: userId,
      contest: contestId,
    });

    if (!participation) {
      return res.status(404).json({
        message: "Participation not found",
      });
    }

    // ❌ Check deadline
    const contest = await Contest.findById(contestId);
    if (contest.contestDeadLine && new Date() > contest.contestDeadLine) {
      return res.status(400).json({
        message: "Submission deadline passed",
      });
    }

    // ✅ Update submission
    participation.submissionLink = submissionLink;
    participation.description = description;
    participation.submissionStatus = "Submitted";
    participation.submittedAt = new Date();

    await participation.save();

    return res.status(200).json({
      message: "Project submitted successfully",
      data: participation,
    });
  } catch (error) {
    console.log("Submit Project Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ 3. VIEW ALL PARTICIPANTS (with full details)
export const getAllParticipants = async (req, res) => {
  try {
    const participants = await Participation.find()
      .populate("user", "userName email contact gender")
      .populate(
        "contest",
        "contestTitle contestDescription category status contestDeadLine",
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      total: participants.length,
      data: participants,
    });
  } catch (error) {
    console.log("Get Participants Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
