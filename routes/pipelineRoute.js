import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  CreatePipeline,
  CreatePipelineCadence,
  GetPipelines,
  AssignLeadsToPipelineAndAgents,
  UpdatePipeline,
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
PipelineRouter.post("/updatePipeline", verifyJwtToken, UpdatePipeline);
PipelineRouter.post(
  "/assignLeadsToPipeline",
  verifyJwtToken,
  AssignLeadsToPipelineAndAgents
);
PipelineRouter.post(
  "/createPipelineCadence",
  verifyJwtToken,
  CreatePipelineCadence
);

PipelineRouter.get("/getPipelines", verifyJwtToken, GetPipelines);

export default PipelineRouter;
