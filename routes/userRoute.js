import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
  LoginUser,
  RegisterUser,
  CheckPhoneExists,
  CheckEmailExists,
  GetProfileMine,
  GetTransactionsHistory,
  SendPhoneVerificationCode,
  UpdateProfile,
} from "../controllers/userController.js";

import {
  GetNotifications,
  ReadAllNotifications,
} from "../controllers/NotificationController.js";

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

UserRouter.post("/generateApiKey", verifyJwtTokenWithTeam, GenerateApiKey);
UserRouter.get("/apiKeys", verifyJwtTokenWithTeam, GetMyApiKeys);

UserRouter.post("/createWebhook", verifyJwtTokenWithTeam, CreateWebhook);
UserRouter.post("/deleteWebhook", verifyJwtTokenWithTeam, DeleteWebhook);
UserRouter.get("/getWebhooks", verifyJwtTokenWithTeam, GetAllWebhooks);
UserRouter.get("/myProfile", verifyJwtTokenWithTeam, GetProfileMine);
UserRouter.get(
  "/getTransactionsHistory",
  verifyJwtTokenWithTeam,
  GetTransactionsHistory
);
// getTransactionsHistory

// UserRouter.post("/updateProfile", verifyJwtTokenWithTeam, uploadFiles, UpdateProfile);
UserRouter.post("/checkPhoneNumber", CheckPhoneExists);
// UserRouter.post("/checkUsernameExists", CheckUsernameExists);
// UserRouter.get("/getProfileFromUsername", GetProfileWithUsername);
UserRouter.post("/checkEmailExists", CheckEmailExists);
// UserRouter.post("/sendVerificationCode", SendPhoneVerificationCode);
// UserRouter.post("/verifyCode", VerifyPhoneCode);

// UserRouter.post("/sendVerificationEmail", SendEmailVerificationCode);
// UserRouter.post("/verifyEmail", VerifyEmailCode);

//Payment
UserRouter.post("/addPaymentMethod", verifyJwtTokenWithTeam, AddPaymentMethod);
UserRouter.post(
  "/subscribePlan",
  verifyJwtTokenWithTeam,
  SubscribePayasyougoPlan
);
UserRouter.post(
  "/setDefaultPaymentMethod",
  verifyJwtTokenWithTeam,
  SetDefaultPaymentmethod
);

UserRouter.post("/cancelPlan", verifyJwtTokenWithTeam, CancelPlan);
UserRouter.post(
  "/redeemAbortCancelReward",
  verifyJwtTokenWithTeam,
  RedeemAbortCancellationReward
);
UserRouter.get("/getPaymentMethods", verifyJwtTokenWithTeam, GetPaymentmethods);

UserRouter.post("/updateProfile", verifyJwtTokenWithTeam, UpdateProfile);

UserRouter.get("/notifications", verifyJwtTokenWithTeam, GetNotifications);
UserRouter.post(
  "/readAllNotifications",
  verifyJwtTokenWithTeam,
  ReadAllNotifications
);
export default UserRouter;
