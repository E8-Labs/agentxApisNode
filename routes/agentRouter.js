import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  CreateAssistantSynthflow,
  BuildAgent,
  UpdateAgent,
  GetVoices,
  AddKyc,
  GetKyc,
  WebhookSynthflow,
  GetAgents,
  GetAgentCallActivity,
} from "../controllers/synthflowController.js";

import {
  ListAvailableNumbers,
  PurchasePhoneNumber,
  ListUsersAvailablePhoneNumbers,
  AssignPhoneNumber,
} from "../controllers/twilioController.js";
// import { verify } from "jsonwebtoken";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let AgentRouter = express.Router();

AgentRouter.post("/buildAgent", verifyJwtToken, uploadFiles, BuildAgent);
AgentRouter.post("/updateAgent", verifyJwtToken, uploadFiles, UpdateAgent);

AgentRouter.get("/getAgents", verifyJwtToken, uploadFiles, GetAgents);
AgentRouter.get("/getAgentCallActivity", verifyJwtToken, GetAgentCallActivity);

AgentRouter.get(
  "/findPhoneNumbers",
  verifyJwtToken,
  uploadFiles,
  ListAvailableNumbers
);
AgentRouter.get(
  "/listUsersAvailablePhoneNumbers",
  verifyJwtToken,
  uploadFiles,
  ListUsersAvailablePhoneNumbers
);
AgentRouter.get("/voices", uploadFiles, GetVoices);
AgentRouter.post(
  "/purchasePhone",
  verifyJwtToken,
  uploadFiles,
  PurchasePhoneNumber
);
AgentRouter.post(
  "/assignPhoneNumber",
  verifyJwtToken,
  uploadFiles,
  AssignPhoneNumber
);

//Kycs
AgentRouter.get("/getKycs", verifyJwtToken, uploadFiles, GetKyc);
//Add Kyc
AgentRouter.post("/addKyc", verifyJwtToken, uploadFiles, AddKyc);
AgentRouter.post("/webhook_synthflow", WebhookSynthflow);

// UserRouter.post("/register", verifyJwtToken, uploadFiles, RegisterUser);

// UserRouter.post("/updateProfile", verifyJwtToken, uploadFiles, UpdateProfile);
// UserRouter.post("/checkPhoneNumber", CheckPhoneExists);
// UserRouter.post("/checkUsernameExists", CheckUsernameExists);
// UserRouter.get("/getProfileFromUsername", GetProfileWithUsername);
// UserRouter.post("/checkEmailExists", CheckEmailExists);
// UserRouter.post("/sendVerificationCode", SendPhoneVerificationCode);
// UserRouter.post("/verifyCode", VerifyPhoneCode);

// UserRouter.post("/sendVerificationEmail", SendEmailVerificationCode);
// UserRouter.post("/verifyEmail", VerifyEmailCode);

export default AgentRouter;
