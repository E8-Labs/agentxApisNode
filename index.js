import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
// import nodeCron from 'node-cron'
import { fileURLToPath } from "url";
import db from "./models/index.js";

import UserRouter from "./routes/userRoute.js";
import DataRouter from "./routes/dataRoute.js";
import AgentRouter from "./routes/agentRouter.js";
import PipelineRouter from "./routes/pipelineRoute.js";
import LeadRouter from "./routes/leadRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  if (
    req.path.endsWith(".jpg") ||
    req.path.endsWith(".jpeg") ||
    req.path.endsWith(".png") ||
    req.path.endsWith(".gif")
  ) {
    res.setHeader("Content-Type", "image/jpeg");
  }
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((req, res, next) => {
  console.log(`${req.method} request for '${req.url}'`);
  next();
});

//http://localhost:3000
// app.use(
//   cors({
//     origin: process.env.AppHost, //https://voiceai-ruby.vercel.app
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );

// app.options("*", (req, res) => {
//   res.header("Access-Control-Allow-Origin", process.env.AppHost);
//   res.header("Access-Control-Allow-Methods", "GET, POST");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.header("Access-Control-Allow-Credentials", "true");
//   res.sendStatus(200);
// });

const allowedOrigins = [
  "https://agentx-umber.vercel.app",
  "http://localhost:3000",
  "https://yet-another-allowed-origin.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        // Allow requests with no origin (like mobile apps or curl requests) or if the origin is in the list
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.header("Origin")); // Dynamically set based on request origin
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

db.sequelize.sync({ alter: true });

app.use("/api/user", UserRouter);
app.use("/api/data", DataRouter);
app.use("/api/agent", AgentRouter);
app.use("/api/pipeline", PipelineRouter);
app.use("/api/leads", LeadRouter);
// app.use("/api/review", ReviewRouter);
// app.use("/api/admin", AdminRouter);

const server = app.listen(process.env.Port, () => {
  console.log("Started listening on " + process.env.Port);
});
