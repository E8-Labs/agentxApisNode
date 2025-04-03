// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import { CreateAgencyAccountOnboardingLink } from "../controllers/agency/agencyController.js";
let agencyRouter = express.Router();

agencyRouter.post(
  "/createConnectLink",
  verifyJwtTokenWithTeam,
  uploadFiles,
  CreateAgencyAccountOnboardingLink
);

export default agencyRouter;
