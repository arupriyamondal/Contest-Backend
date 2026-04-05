import mongoose, { Schema, model } from "mongoose";

const resultSchema = new Schema(
  {
    // 🔗 Contest reference
    contest: {
      type: Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },

    // 🔗 User reference
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔗 Participation reference (optional but useful)
    participation: {
      type: Schema.Types.ObjectId,
      ref: "Participation",
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

    // 📝 Remarks (optional)
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ❗ Prevent duplicate result per user per contest
resultSchema.index({ user: 1, contest: 1 }, { unique: true });

const Result = model("Result", resultSchema);

export { Result };