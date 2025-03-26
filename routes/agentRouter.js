import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
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
  GenerateFirstAINotification,
  UpdateSubAgent,
  GetVoicemailMessage,
  GetAgentDetails,
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
  TransferNumber,
  ReattachNumbersToAgents,
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
  uploadFiles,
  verifyJwtTokenWithTeam,

  GetDashboardData
);

AgentRouter.get(
  "/getAgentDetails",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  GetAgentDetails
);

AgentRouter.post(
  "/buildAgent",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  BuildAgent
);
AgentRouter.post(
  "/transferNumber",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  TransferNumber
);
AgentRouter.post(
  "/reattachNumbers",
  uploadFiles,
  verifyJwtTokenWithTeam,
  ReattachNumbersToAgents
);
AgentRouter.post(
  "/updateAgent",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  UpdateAgent
);
AgentRouter.post(
  "/updateSubAgent",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  UpdateSubAgent
);
AgentRouter.post(
  "/updateAgentProfileImage",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  UploadAgentImage
);
AgentRouter.post(
  "/deleteAgent",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  DeleteAgent
);

AgentRouter.post("/testAi", verifyJwtTokenWithTeam, uploadFiles, TestAI);
AgentRouter.post(
  "/sendTestAiNotification",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  GenerateFirstAINotification
);

AgentRouter.get("/getAgents", verifyJwtTokenWithTeam, uploadFiles, GetAgents);
AgentRouter.get(
  "/getAgentCallActivity",
  uploadFiles,
  verifyJwtTokenWithTeam,
  GetAgentCallActivity
);

AgentRouter.get(
  "/findPhoneNumbers",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  ListAvailableNumbers
);
AgentRouter.get(
  "/listUsersAvailablePhoneNumbers",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  ListUsersAvailablePhoneNumbers
);
AgentRouter.get("/voices", uploadFiles, GetVoices);
AgentRouter.post(
  "/purchasePhone",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  PurchasePhoneNumber
);
AgentRouter.post(
  "/assignPhoneNumber",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  AssignPhoneNumber
);

AgentRouter.post(
  "/releasePhoneNumber",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  ReleasePhoneNumber
);

AgentRouter.post(
  "/deletePhoneNumber",
  uploadFiles,
  verifyJwtTokenWithTeam,
  // uploadFiles,
  DeleteNumber
);

//Kycs
AgentRouter.get("/getKycs", uploadFiles, verifyJwtTokenWithTeam, GetKyc);
//Add Kyc
AgentRouter.post("/addKyc", uploadFiles, verifyJwtTokenWithTeam, AddKyc);
//Update Kyc
AgentRouter.post("/updateKyc", uploadFiles, verifyJwtTokenWithTeam, UpdateKyc);

AgentRouter.post("/deleteKyc", uploadFiles, verifyJwtTokenWithTeam, DeleteKyc);

AgentRouter.post("/updateCallStatusForAll", SetOutcomeforpreviousCalls);

AgentRouter.post(
  "/addObjectionGuardRail",
  uploadFiles,
  verifyJwtTokenWithTeam,

  AddObjectionOrGuardrail
);

AgentRouter.post(
  "/deleteObjectionGuardRail",
  uploadFiles,
  verifyJwtTokenWithTeam,

  DeleteObjectionOrGuardrail
);

AgentRouter.get(
  "/getObjectionsAndGuardrails",
  uploadFiles,
  verifyJwtTokenWithTeam,

  GetObjectionsAndGuardrails
);

AgentRouter.get("/getVoiceMail", GetVoicemailMessage);

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
