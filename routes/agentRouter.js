import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  CreateAssistantSynthflow,
  BuildAgent,
  GetVoices,
  AddKyc,
  GetKyc,
} from "../controllers/synthflowController.js";

import {
  ListAvailableNumbers,
  PurchasePhoneNumber,
} from "../controllers/twilioController.js";

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

AgentRouter.get(
  "/findPhoneNumbers",
  verifyJwtToken,
  uploadFiles,
  ListAvailableNumbers
);
AgentRouter.get("/voices", uploadFiles, GetVoices);
AgentRouter.post(
  "/purchasePhone",
  verifyJwtToken,
  uploadFiles,
  PurchasePhoneNumber
);

//Kycs
AgentRouter.get("/getKycs", verifyJwtToken, uploadFiles, GetKyc);
//Add Kyc
AgentRouter.post("/addKyc", verifyJwtToken, uploadFiles, AddKyc);
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
