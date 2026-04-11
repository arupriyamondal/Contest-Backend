import mongoose, { Schema, model } from "mongoose";

const inviteSchema = new Schema(
  {
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    contest: {
      type: Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },

    actionType: {
      type: String,
      enum: ["INVITE", "JOIN_REQUEST"],
      required: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User", // who sent invite or request
      required: true,
    },

    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User", // who receives invite (null for join request)
      default: null,
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },

    message: {
      type: String,
      trim: true,
    },
    
  },
  { timestamps: true }
);

const Invite = model("Invite", inviteSchema);

export { Invite };