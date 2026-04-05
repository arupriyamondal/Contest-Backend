import mongoose, { model, Schema } from "mongoose";

const participationSchema = new Schema(
  {
    // 🔗 Reference to User
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔗 Reference to Contest
    contest: {
      type: Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },

    // 📤 Submission Data
    submissionLink: {
      type: String, // GitHub / Drive / Live URL
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // 🏆 Status of submission
    submissionStatus: {
      type: String,
      enum: ["Pending", "Submitted"],
      default: "Pending",
    },

    // ⭐ Optional scoring
    score: {
      type: Number,
      default: 0,
    },

    // 📅 Submitted time
    submittedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ❗ Prevent duplicate participation (one user → one contest)
participationSchema.index({ user: 1, contest: 1 }, { unique: true });

const Participation = model("Participation", participationSchema);

export { Participation };