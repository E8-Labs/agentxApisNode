import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
  GetUsers,
  AddAnAffiliate,
  GetAffiliates,
  DeleteAnAffiliate,
  GetAdminStats,
  GetAdminAnalytics,
  GetUsersForAffiliates,
  GetAdminEngagements,
  GetUsersWithUniqueNumbers,
  GetCallLogs,
} from "../controllers/adminController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let AdminRouter = express.Router();

AdminRouter.get("/users", verifyJwtTokenWithTeam, uploadFiles, GetUsers);
AdminRouter.get(
  "/usersForAffiliate",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetUsersForAffiliates
);
AdminRouter.post(
  "/addAffiliate",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AddAnAffiliate
);
AdminRouter.post(
  "/deleteAffiliate",
  verifyJwtTokenWithTeam,
  uploadFiles,
  DeleteAnAffiliate
);
AdminRouter.get(
  "/getAffiliates",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetAffiliates
);

AdminRouter.get(
  "/adminStats",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetAdminStats
);

AdminRouter.get(
  "/adminAnalytics",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetAdminAnalytics
);
AdminRouter.get(
  "/adminEngagements",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetAdminEngagements
);

AdminRouter.get(
  "/adminUsersWithUniquePhoneNumbers",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetUsersWithUniqueNumbers
);

AdminRouter.get(
  "/callLogsAdmin",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetCallLogs
);

export default AdminRouter;
