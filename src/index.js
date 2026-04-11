import dotenv from "dotenv";
dotenv.config();

import express, { urlencoded } from "express";
import { dbConnect } from "./dbconnect/dbconnect.js";
import userRouter from "./routers/user.routes.js";
import cors from "cors";
import cookiParser from "cookie-parser";
import errorMiddleware from "./middlewares/error.middle.js";
import contestrouter from "./routers/contest.routes.js";

import resultRouter from "./routers/result.routes.js";
import teamRouter from "./routers/team.routes.js";
import fs from "fs";
import path from "path";
import inviterouter from "./routers/invite.routes.js";

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

dbConnect();

const app = express();

const PORT = process.env.PORT || 3000;

// ✅ Allowed origins
const allowedOrigins = [
  "https://contest-koushik-arupriya.vercel.app",
  "http://localhost:5173",
];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
// 👇 ADD THIS LINE
app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(cookiParser());
app.use(urlencoded({ extended: true }));

// ✅ Root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is running successfully 🚀",
  });
});

// Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/contest", contestrouter);
app.use("/api/v1/result",resultRouter)
app.use("/api/v1/invite",inviterouter)
app.use("/api/v1/team",teamRouter)
app.use(errorMiddleware);

// Server start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

