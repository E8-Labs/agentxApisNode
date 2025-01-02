// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import {
  InviteTeamMember,
  GetTeamMembers,
} from "../controllers/TeamController.js";

let teamRouter = express.Router();

teamRouter.get("/getTeamMembers", verifyJwtTokenWithTeam, GetTeamMembers);
teamRouter.post(
  "/inviteTeamMember",
  verifyJwtTokenWithTeam,
  uploadFiles,
  InviteTeamMember
);

export default teamRouter;
