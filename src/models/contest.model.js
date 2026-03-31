import mongoose, { model, Schema } from "mongoose";

const contestSchema = new Schema(
  {
    contestTitle: {
      type: String,
      require: true,
      unique: true,
      trim: true,
    },
    contestDescription: {
      type: String,
      require: true,
      trim: true,
    },
    projectBriefing: {
      type: String,
      require: true,
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
    limit:{
      type:Number
    }
  },
  { timestamps: true },
);

const Contest = model("Contest", contestSchema);

export { Contest };
