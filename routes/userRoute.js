import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  LoginUser,
  RegisterUser,
  CheckPhoneExists,
  CheckEmailExists,
  GetProfileMine,
  GetTransactionsHistory,
  SendPhoneVerificationCode,
} from "../controllers/userController.js";

import {
  CreateWebhook,
  GetAllWebhooks,
  DeleteWebhook,
} from "../controllers/WebhookController.js";

import {
  AddPaymentMethod,
  SubscribePayasyougoPlan,
  GetPaymentmethods,
  SetDefaultPaymentmethod,
  CancelPlan,
  RedeemAbortCancellationReward,
} from "../controllers/PaymentController.js";

import { GenerateApiKey, GetMyApiKeys } from "../controllers/apiController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let UserRouter = express.Router();

UserRouter.post("/sendVerificationCode", SendPhoneVerificationCode);
UserRouter.post("/login", LoginUser);
UserRouter.post("/register", uploadFiles, RegisterUser);

UserRouter.post("/generateApiKey", verifyJwtToken, GenerateApiKey);
UserRouter.get("/apiKeys", verifyJwtToken, GetMyApiKeys);

UserRouter.post("/createWebhook", verifyJwtToken, CreateWebhook);
UserRouter.post("/deleteWebhook", verifyJwtToken, DeleteWebhook);
UserRouter.get("/getWebhooks", verifyJwtToken, GetAllWebhooks);
UserRouter.get("/myProfile", verifyJwtToken, GetProfileMine);
UserRouter.get(
  "/getTransactionsHistory",
  verifyJwtToken,
  GetTransactionsHistory
);
// getTransactionsHistory

// UserRouter.post("/updateProfile", verifyJwtToken, uploadFiles, UpdateProfile);
UserRouter.post("/checkPhoneNumber", CheckPhoneExists);
// UserRouter.post("/checkUsernameExists", CheckUsernameExists);
// UserRouter.get("/getProfileFromUsername", GetProfileWithUsername);
UserRouter.post("/checkEmailExists", CheckEmailExists);
// UserRouter.post("/sendVerificationCode", SendPhoneVerificationCode);
// UserRouter.post("/verifyCode", VerifyPhoneCode);

// UserRouter.post("/sendVerificationEmail", SendEmailVerificationCode);
// UserRouter.post("/verifyEmail", VerifyEmailCode);

//Payment
UserRouter.post("/addPaymentMethod", verifyJwtToken, AddPaymentMethod);
UserRouter.post("/subscribePlan", verifyJwtToken, SubscribePayasyougoPlan);
UserRouter.post(
  "/setDefaultPaymentMethod",
  verifyJwtToken,
  SetDefaultPaymentmethod
);

UserRouter.post("/cancelPlan", verifyJwtToken, CancelPlan);
UserRouter.post(
  "/redeemAbortCancelReward",
  verifyJwtToken,
  RedeemAbortCancellationReward
);
UserRouter.get("/getPaymentMethods", verifyJwtToken, GetPaymentmethods);
export default UserRouter;
