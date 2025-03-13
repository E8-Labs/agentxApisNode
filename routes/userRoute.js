import express from "express";
import multer from "multer";

import verifyJwtToken, {
  NoAuthMiddleware,
  verifyJwtTokenWithTeam,
} from "../middleware/jwtmiddleware.js";
import {
  LoginUser,
  RegisterUser,
  CheckPhoneExists,
  CheckEmailExists,
  GetProfileMine,
  GetTransactionsHistory,
  SendPhoneVerificationCode,
  UpdateProfile,
  AddTestNumber,
  DeleteTestNumber,
  SendFeedbackEmail,
  UploadVideo,
  DeleteUserProfile,
  DeleteUserProfileTemporary,
  GetProfileById,
} from "../controllers/userController.js";

import {
  GetNotifications,
  ReadAllNotifications,
  SendTestNotification,
  SendTestEmail,
  SendDesktopEmail,
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
  AddCancelPlanReason,
  RedeemAbortCancellationReward,
  GetPaymentmethodsAllUsers,
  PurchaseSupportPlan,
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

UserRouter.post(
  "/sendVerificationCode",
  NoAuthMiddleware,
  SendPhoneVerificationCode
);
UserRouter.post(
  "/addTestNumbers",
  NoAuthMiddleware,
  uploadFiles,
  AddTestNumber
);
UserRouter.post(
  "/deleteTestNumber",
  NoAuthMiddleware,
  uploadFiles,
  DeleteTestNumber
);
UserRouter.post("/login", NoAuthMiddleware, LoginUser);
UserRouter.post("/register", uploadFiles, NoAuthMiddleware, RegisterUser);

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

UserRouter.post("/deleteProfile", verifyJwtToken, DeleteUserProfileTemporary);
UserRouter.post("/deleteProfilePermanent", verifyJwtToken, DeleteUserProfile);
UserRouter.post(
  "/sendFeedback",
  verifyJwtTokenWithTeam,
  uploadFiles,
  SendFeedbackEmail
);
// getTransactionsHistory

// UserRouter.post("/updateProfile", verifyJwtTokenWithTeam, uploadFiles, UpdateProfile);
UserRouter.post("/checkPhoneNumber", NoAuthMiddleware, CheckPhoneExists);
// UserRouter.post("/checkUsernameExists", CheckUsernameExists);
UserRouter.get("/getProfileFromId", GetProfileById);
UserRouter.post("/checkEmailExists", NoAuthMiddleware, CheckEmailExists);
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
  "/purchaseSupportPlan",
  verifyJwtTokenWithTeam,
  PurchaseSupportPlan
);

UserRouter.post(
  "/addCancelPlanReason",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AddCancelPlanReason
);
UserRouter.post(
  "/setDefaultPaymentMethod",
  verifyJwtTokenWithTeam,
  uploadFiles,
  SetDefaultPaymentmethod
);

UserRouter.post("/cancelPlan", verifyJwtTokenWithTeam, CancelPlan);
UserRouter.post(
  "/redeemAbortCancelReward",
  verifyJwtTokenWithTeam,
  RedeemAbortCancellationReward
);
UserRouter.get("/getPaymentMethods", verifyJwtTokenWithTeam, GetPaymentmethods);
UserRouter.get(
  "/getPaymentMethodsAllUsers",
  verifyJwtTokenWithTeam,
  GetPaymentmethodsAllUsers
);

UserRouter.post(
  "/updateProfile",
  verifyJwtTokenWithTeam,
  uploadFiles,
  UpdateProfile
);

UserRouter.get("/notifications", verifyJwtTokenWithTeam, GetNotifications);
UserRouter.post(
  "/readAllNotifications",
  verifyJwtTokenWithTeam,
  ReadAllNotifications
);

UserRouter.post("/uploadHowTo", uploadFiles, UploadVideo);

//SendTestNotification
UserRouter.post("/sendTestNotification", uploadFiles, SendTestNotification);
UserRouter.post("/sendTestEmail", uploadFiles, SendTestEmail);
export default UserRouter;
