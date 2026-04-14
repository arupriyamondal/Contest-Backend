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
      enum: ["MERN", "UI/UX DESIGN", "DIGITAL MARKETING", "WEBSITE DESIGNING"],
      required: true,
    },

    entryLimit: {
      type: Number,
    },

    projectType: {
      type: String,
      enum: ["Individual", "Team", "Both"],
      required: true,
    },

    teamSize: {
      type: Number,
      default: 1,
    },

    // ✅ Contest Image (Cloudinary)
    contestImage: {
      url: {
        type: String,
        default: "",
      },
      public_id: {
        type: String,
        default: "",
      },
    },

    // ✅ Contest PDF (Cloudinary)
    contestPDF: {
      url: {
        type: String,
        default: "",
      },
      public_id: {
        type: String,
        default: "",
      },
      fileName: {
        type: String,
        default: "",
      },
    },

    // ✅ ONLY Rule Sections (No simple rules array)
    ruleSections: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        points: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const Contest = model("Contest", contestSchema);

export { Contest };