import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  LoginUser,
  RegisterUser,
  CheckPhoneExists,
  CheckEmailExists,
} from "../controllers/userController.js";

import {
  CreateWebhook,
  GetAllWebhooks,
} from "../controllers/WebhookController.js";

import {
  AddPaymentMethod,
  SubscribePayasyougoPlan,
  GetPaymentmethods,
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

UserRouter.post("/login", LoginUser);
UserRouter.post("/register", uploadFiles, RegisterUser);

UserRouter.post("/generateApiKey", verifyJwtToken, GenerateApiKey);
UserRouter.get("/apiKeys", verifyJwtToken, GetMyApiKeys);

UserRouter.post("/createWebhook", verifyJwtToken, CreateWebhook);
UserRouter.get("/getWebhooks", verifyJwtToken, GetAllWebhooks);

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
UserRouter.get("/getPaymentMethods", verifyJwtToken, GetPaymentmethods);
export default UserRouter;
