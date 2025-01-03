import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
  CreateAssistantSynthflow,
  BuildAgent,
  UpdateAgent,
  DeleteAgent,
  GetVoices,
  AddKyc,
  UpdateKyc,
  GetKyc,
  DeleteKyc,
  GetAgents,
  GetAgentCallActivity,
  AddObjectionOrGuardrail,
  DeleteObjectionOrGuardrail,
  GetObjectionsAndGuardrails,
  UploadAgentImage,
  TestAI,
} from "../controllers/synthflowController.js";

import {
  SetOutcomeforpreviousCalls,
  WebhookSynthflow,
} from "../controllers/WebhookSynthflowController.js";

import {
  ListAvailableNumbers,
  PurchasePhoneNumber,
  ListUsersAvailablePhoneNumbers,
  AssignPhoneNumber,
  ReleasePhoneNumber,
  DeleteNumber,
} from "../controllers/twilioController.js";

import { GetDashboardData } from "../controllers/DashboardController.js";
// import { verify } from "jsonwebtoken";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  // { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let AgentRouter = express.Router();

AgentRouter.get(
  "/dashboard",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetDashboardData
);

AgentRouter.post(
  "/buildAgent",
  verifyJwtTokenWithTeam,
  uploadFiles,
  BuildAgent
);
AgentRouter.post(
  "/updateAgent",
  verifyJwtTokenWithTeam,
  uploadFiles,
  UpdateAgent
);
AgentRouter.post(
  "/updateAgentProfileImage",
  verifyJwtTokenWithTeam,
  uploadFiles,
  UploadAgentImage
);
AgentRouter.post(
  "/deleteAgent",
  verifyJwtTokenWithTeam,
  uploadFiles,
  DeleteAgent
);

AgentRouter.post("/testAi", verifyJwtTokenWithTeam, uploadFiles, TestAI);

AgentRouter.get("/getAgents", verifyJwtTokenWithTeam, uploadFiles, GetAgents);
AgentRouter.get(
  "/getAgentCallActivity",
  verifyJwtTokenWithTeam,
  GetAgentCallActivity
);

AgentRouter.get(
  "/findPhoneNumbers",
  verifyJwtTokenWithTeam,
  uploadFiles,
  ListAvailableNumbers
);
AgentRouter.get(
  "/listUsersAvailablePhoneNumbers",
  verifyJwtTokenWithTeam,
  uploadFiles,
  ListUsersAvailablePhoneNumbers
);
AgentRouter.get("/voices", uploadFiles, GetVoices);
AgentRouter.post(
  "/purchasePhone",
  verifyJwtTokenWithTeam,
  uploadFiles,
  PurchasePhoneNumber
);
AgentRouter.post(
  "/assignPhoneNumber",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AssignPhoneNumber
);

AgentRouter.post(
  "/releasePhoneNumber",
  verifyJwtTokenWithTeam,
  uploadFiles,
  ReleasePhoneNumber
);

AgentRouter.post(
  "/deletePhoneNumber",
  verifyJwtTokenWithTeam,
  uploadFiles,
  DeleteNumber
);

//Kycs
AgentRouter.get("/getKycs", verifyJwtTokenWithTeam, uploadFiles, GetKyc);
//Add Kyc
AgentRouter.post("/addKyc", verifyJwtTokenWithTeam, uploadFiles, AddKyc);
//Update Kyc
AgentRouter.post("/updateKyc", verifyJwtTokenWithTeam, uploadFiles, UpdateKyc);

AgentRouter.post("/deleteKyc", verifyJwtTokenWithTeam, uploadFiles, DeleteKyc);

AgentRouter.post("/updateCallStatusForAll", SetOutcomeforpreviousCalls);

AgentRouter.post(
  "/addObjectionGuardRail",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AddObjectionOrGuardrail
);

AgentRouter.post(
  "/deleteObjectionGuardRail",
  verifyJwtTokenWithTeam,
  uploadFiles,
  DeleteObjectionOrGuardrail
);

AgentRouter.get(
  "/getObjectionsAndGuardrails",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetObjectionsAndGuardrails
);

AgentRouter.post("/webhook_synthflow", WebhookSynthflow);

// UserRouter.post("/register", verifyJwtTokenWithTeam, uploadFiles, RegisterUser);

// UserRouter.post("/updateProfile", verifyJwtTokenWithTeam, uploadFiles, UpdateProfile);
// UserRouter.post("/checkPhoneNumber", CheckPhoneExists);
// UserRouter.post("/checkUsernameExists", CheckUsernameExists);
// UserRouter.get("/getProfileFromUsername", GetProfileWithUsername);
// UserRouter.post("/checkEmailExists", CheckEmailExists);
// UserRouter.post("/sendVerificationCode", SendPhoneVerificationCode);
// UserRouter.post("/verifyCode", VerifyPhoneCode);

// UserRouter.post("/sendVerificationEmail", SendEmailVerificationCode);
// UserRouter.post("/verifyEmail", VerifyEmailCode);

export default AgentRouter;
