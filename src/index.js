import dotenv from "dotenv";
dotenv.config();
import express, { urlencoded } from "express";
import { dbConnect } from "./dbconnect/dbconnect.js";
import userRouter from "./routers/user.routes.js";
import cors from "cors";
dbConnect();
const app = express();

const PORT = process.env.PORT || 3000;
app.use(
  cors({
    origin: "http://localhost:5173", // your React app
    credentials: true,
  }),
);

app.listen(PORT, () => {
  console.log(`the port running on ${PORT}`);
});

app.use(express.json());

app.use(urlencoded({ extended: true }));

app.use("/api/v1/user", userRouter);
