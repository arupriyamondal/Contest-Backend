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

    leader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    joinCode: {
      type: String,
      unique: true,
      sparse: true,
    },

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

// ✅ FIXED HOOK
teamSchema.pre("save", async function () {
  if (!this.members.some(id => id.toString() === this.leader.toString())) {
    this.members.push(this.leader);
  }

  const contest = await mongoose.model("Contest").findById(this.contest);

  if (contest && this.members.length > contest.teamSize) {
    throw new Error(`Team can have max ${contest.teamSize} members`);
  }

  this.submissionStatus = this.submissionLink ? "Submitted" : "Pending";
});

const Team = model("Team", teamSchema);

export { Team };