import mongoose, { Schema, model } from "mongoose";

const resultSchema = new Schema(
  {
    // 🔗 Contest reference
    contest: {
      type: Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },

    // 👥 Team reference (NEW)
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    // 🏆 Rank
    rank: {
      type: String,
      enum: ["1st", "2nd", "3rd", "Participant"],
      required: true,
    },

    // ⭐ Score
    score: {
      type: Number,
      default: 0,
    },

    // 📝 Remarks
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ❗ Prevent duplicate result per team per contest
resultSchema.index({ team: 1, contest: 1 }, { unique: true });

const Result = model("Result", resultSchema);

export { Result };