import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
  CreatePipeline,
  CreatePipelineCadence,
  GetPipelines,
  AssignLeadsToPipelineAndAgents,
  UpdatePipeline,
  PausePipelineCadenceForAnAgent,
  ResumePipelineCadenceForAnAgent,
  GetScheduledCalls,
  CreatePipelineStage,
  ReorderPipelineStages,
  DeletePipelineStage,
  UpdatePipelineStage,
  DeletePipeline,
  GetAgentCadence,
  GetPipelineDetail,
  GetLeadsForABatch,
  GetCallsForABatch,
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
  verifyJwtTokenWithTeam,
  uploadMedia,
  GetAgentCadence
);
PipelineRouter.post(
  "/createPipeline",
  verifyJwtTokenWithTeam,
  uploadMedia,
  CreatePipeline
);
PipelineRouter.post(
  "/updatePipeline",
  verifyJwtTokenWithTeam,
  uploadMedia,
  UpdatePipeline
);
PipelineRouter.post(
  "/createStage",
  verifyJwtTokenWithTeam,
  uploadMedia,
  CreatePipelineStage
);

PipelineRouter.post(
  "/deletePipeline",
  verifyJwtTokenWithTeam,
  uploadMedia,
  DeletePipeline
);

PipelineRouter.post(
  "/updateStage",
  verifyJwtTokenWithTeam,
  uploadMedia,
  UpdatePipelineStage
);
PipelineRouter.post(
  "/reorderStages",
  verifyJwtTokenWithTeam,
  uploadMedia,
  ReorderPipelineStages
);
PipelineRouter.post(
  "/deletePipelineStage",
  verifyJwtTokenWithTeam,
  uploadMedia,
  DeletePipelineStage
);
PipelineRouter.post(
  "/pauseAgentCadence",
  verifyJwtTokenWithTeam,
  uploadMedia,
  PausePipelineCadenceForAnAgent
);
PipelineRouter.post(
  "/resumeAgentCadence",
  verifyJwtTokenWithTeam,
  uploadMedia,
  ResumePipelineCadenceForAnAgent
);
PipelineRouter.post(
  "/assignLeadsToPipeline",
  verifyJwtTokenWithTeam,
  uploadMedia,
  AssignLeadsToPipelineAndAgents
);
PipelineRouter.post(
  "/createPipelineCadence",
  verifyJwtTokenWithTeam,
  uploadMedia,
  CreatePipelineCadence
);

PipelineRouter.get(
  "/getPipeline",
  verifyJwtTokenWithTeam,
  uploadMedia,
  GetPipelineDetail
);
PipelineRouter.get(
  "/getScheduledCalls",
  verifyJwtTokenWithTeam,
  GetScheduledCalls
);

PipelineRouter.get(
  "/getCallsInABatch",
  verifyJwtTokenWithTeam,
  GetCallsForABatch
);

PipelineRouter.get("/leadsInBatch", verifyJwtTokenWithTeam, GetLeadsForABatch);

PipelineRouter.get("/getPipelines", verifyJwtTokenWithTeam, GetPipelines);

export default PipelineRouter;
