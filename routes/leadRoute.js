import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
  AddLeads,
  GetSheets,
  AddSmartList,
  GetLeads,
  GetUniqueColumns,
  GetCallLogs,
  GetImportantCalls,
  DeleteList,
  AddLeadNote,
  AddLeadTag,
  DeleteLeadTag,
  GetLeadDetail,
  UpdateLeadStage,
  DeleteLead,
  GetUniqueTags,
} from "../controllers/LeadsController.js";
import { EnrichLead } from "../controllers/lead/LeadHelperController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let LeadRouter = express.Router();

LeadRouter.post("/addLeads", verifyJwtTokenWithTeam, AddLeads);
LeadRouter.post("/enrichLead", verifyJwtTokenWithTeam, uploadFiles, EnrichLead);
LeadRouter.post("/deleteLead", verifyJwtTokenWithTeam, DeleteLead);
LeadRouter.post("/updateLeadStage", verifyJwtTokenWithTeam, UpdateLeadStage);
LeadRouter.get("/leadDetail", verifyJwtTokenWithTeam, GetLeadDetail);
LeadRouter.post(
  "/addLeadNote",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AddLeadNote
);
LeadRouter.post("/addLeadTag", verifyJwtTokenWithTeam, uploadFiles, AddLeadTag);
LeadRouter.post(
  "/deleteLeadTag",
  verifyJwtTokenWithTeam,
  uploadFiles,
  DeleteLeadTag
);
LeadRouter.post("/addSmartList", verifyJwtTokenWithTeam, AddSmartList);
LeadRouter.post("/deleteList", verifyJwtTokenWithTeam, DeleteList);
LeadRouter.get("/getLeads", verifyJwtTokenWithTeam, uploadFiles, GetLeads);
LeadRouter.get("/getSheets", verifyJwtTokenWithTeam, uploadFiles, GetSheets);
LeadRouter.get("/callLogs", verifyJwtTokenWithTeam, GetCallLogs);
LeadRouter.get("/importantCalls", verifyJwtTokenWithTeam, GetImportantCalls);
LeadRouter.get(
  "/getUniqueColumns",
  verifyJwtTokenWithTeam,
  uploadFiles,
  GetUniqueColumns
);

LeadRouter.get("/getTagsList", verifyJwtTokenWithTeam, GetUniqueTags);

export default LeadRouter;
