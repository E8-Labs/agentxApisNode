// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import {
  InviteTeamMember,
  GetTeamMembers,
  AssignTeamMemberToLead,
  AssignTeamMemberToStage,
  DeleteInvite,
} from "../controllers/TeamController.js";

let teamRouter = express.Router();

teamRouter.get("/getTeamMembers", verifyJwtTokenWithTeam, GetTeamMembers);
teamRouter.post(
  "/inviteTeamMember",
  verifyJwtTokenWithTeam,
  uploadFiles,
  InviteTeamMember
);
teamRouter.post(
  "/assignLeadToTeam",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AssignTeamMemberToLead
);
teamRouter.post(
  "/assignTeamToStage",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AssignTeamMemberToStage
);

teamRouter.post(
  "deleteTeamMember",
  verifyJwtTokenWithTeam,
  uploadFiles,
  DeleteInvite
);
export default teamRouter;
