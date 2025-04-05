// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import { CreateAgencyAccountOnboardingLink } from "../controllers/agency/agencyController.js";
import {
  CreateAgencyHostedPlan,
  GetAgencyHostedPlans,
  LoadPlansForAgencies,
} from "../controllers/agency/AgencyPaymentPlansController.js";
let agencyRouter = express.Router();

agencyRouter.post(
  "/createConnectLink",
  verifyJwtTokenWithTeam,
  uploadFiles,
  CreateAgencyAccountOnboardingLink
);

agencyRouter.post(
  "/createAgencyPlan",
  verifyJwtTokenWithTeam,
  uploadFiles,
  CreateAgencyHostedPlan
);
agencyRouter.get(
  "/getAgencyPlansList",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetAgencyHostedPlans
);

//Plans that agencies pay for
agencyRouter.get(
  "/getPlanListForAgency",
  verifyJwtTokenWithTeam,
  uploadFiles,
  LoadPlansForAgencies
);
export default agencyRouter;
