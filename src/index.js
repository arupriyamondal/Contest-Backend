import dotenv from "dotenv";
dotenv.config();

import express, { urlencoded } from "express";
import { dbConnect } from "./dbconnect/dbconnect.js";
import userRouter from "./routers/user.routes.js";
import cors from "cors";

dbConnect();

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: "https://desun-contest-kc-am.netlify.app",
  credentials: true,
}));

app.use(express.json());
app.use(urlencoded({ extended: true }));

// ✅ Root route (THIS is what you want)
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is running successfully 🚀"
  });
});

// Routes
app.use("/api/v1/user", userRouter);

// Server start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});