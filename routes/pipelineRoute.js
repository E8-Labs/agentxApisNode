import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  CreatePipeline,
  CreatePipelineCadence,
  GetPipelines,
  AssignLeadsToPipelineAndAgents,
  UpdatePipeline,
  PausePipelineCadenceForAnAgent,
  GetScheduledCalls,
  CreatePipelineStage,
  ReorderPipelineStages,
  DeletePipelineStage,
  UpdatePipelineStage,
  DeletePipeline,
  GetAgentCadence,
  GetPipelineDetail,
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

PipelineRouter.post(
  "/getAgentCadence",
  verifyJwtToken,
  uploadMedia,
  GetAgentCadence
);
PipelineRouter.post(
  "/createPipeline",
  verifyJwtToken,
  uploadMedia,
  CreatePipeline
);
PipelineRouter.post(
  "/updatePipeline",
  verifyJwtToken,
  uploadMedia,
  UpdatePipeline
);
PipelineRouter.post(
  "/createStage",
  verifyJwtToken,
  uploadMedia,
  CreatePipelineStage
);

PipelineRouter.post(
  "/deletePipeline",
  verifyJwtToken,
  uploadMedia,
  DeletePipeline
);

PipelineRouter.post(
  "/updateStage",
  verifyJwtToken,
  uploadMedia,
  UpdatePipelineStage
);
PipelineRouter.post(
  "/reorderStages",
  verifyJwtToken,
  uploadMedia,
  ReorderPipelineStages
);
PipelineRouter.post(
  "/deletePipelineStage",
  verifyJwtToken,
  uploadMedia,
  DeletePipelineStage
);
PipelineRouter.post(
  "/pauseAgentCadence",
  verifyJwtToken,
  uploadMedia,
  PausePipelineCadenceForAnAgent
);
PipelineRouter.post(
  "/assignLeadsToPipeline",
  verifyJwtToken,
  uploadMedia,
  AssignLeadsToPipelineAndAgents
);
PipelineRouter.post(
  "/createPipelineCadence",
  verifyJwtToken,
  uploadMedia,
  CreatePipelineCadence
);

PipelineRouter.get(
  "/getPipeline",
  verifyJwtToken,
  uploadMedia,
  GetPipelineDetail
);
PipelineRouter.get("/getScheduledCalls", verifyJwtToken, GetScheduledCalls);

PipelineRouter.get("/getPipelines", verifyJwtToken, GetPipelines);

export default PipelineRouter;
