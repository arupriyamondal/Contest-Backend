import mongoose, { model, Schema } from "mongoose";

const contestSchema = new Schema(
  {
    contestTitle: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    contestDescription: {
      type: String,
      required: true,
      trim: true,
    },
    projectBriefing: {
      type: String,
      required: true,
      trim: true,
    },
    contestDeadLine: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Upcoming", "On-Going", "Completed"],
      default: "Upcoming",
    },
    category: {
      type: String,
      enum: ["MERN", "UI/UX DESIGN", "DIGITAL MARKETING","WEBSITE DESIGING"],
      required: true,
    },
    entryLimit: {
      type: Number,
    },

    // ✅ New fields
    projectType: {
      type: String,
      enum: ["Individual", "Team"],
      required: true,
    },
    teamSize: {
      type: Number, // Max number of members for team projects
      default: 1,
    },
  },
  { timestamps: true }
);

const Contest = model("Contest", contestSchema);

export { Contest };