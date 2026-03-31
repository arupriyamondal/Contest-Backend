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

    // ✅ Category
    category: {
      type: String,
      enum: ["MERN", "UI/UX DESIGN", "DIGITAL MARKETING"],
      required: true,
    },

    // ✅ Renamed field
    entryLimit: {
      type: Number,
    },
  },
  { timestamps: true }
);

const Contest = model("Contest", contestSchema);

export { Contest };