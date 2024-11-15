import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  CreatePipeline,
  CreatePipelineCadence,
} from "../controllers/pipelineController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let PipelineRouter = express.Router();

PipelineRouter.post("/createPipeline", verifyJwtToken, CreatePipeline);
PipelineRouter.post(
  "/createPipelineCadence",
  verifyJwtToken,
  CreatePipelineCadence
);

export default PipelineRouter;
