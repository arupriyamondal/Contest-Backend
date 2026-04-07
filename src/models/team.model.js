import mongoose, { Schema, model } from "mongoose";

const teamSchema = new Schema(
  {
    teamName: {
      type: String,
      required: true,
      trim: true,
    },

    contest: {
      type: Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    leader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    invitedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    joinRequests: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["Pending", "Accepted", "Rejected"],
          default: "Pending",
        },
      },
    ],

    joinCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ✅ Submission fields
    submissionLink: {
      type: String,
      trim: true,
      default: null,
    },

    submissionStatus: {
      type: String,
      enum: ["Pending", "Submitted"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// ✅ FIXED VALIDATION
teamSchema.pre("save", async function () {

  if (this.members.length > 3) {
    throw new Error("Team cannot have more than 3 members");
  }

  // Auto update submission status
  if (this.submissionLink) {
    this.submissionStatus = "Submitted";
  } else {
    this.submissionStatus = "Pending";
  }
});

// ✅ Prevent duplicate participation
teamSchema.index({ contest: 1, members: 1 }, { unique: true });

const Team = model("Team", teamSchema);

export { Team };