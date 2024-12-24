import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  AddLeads,
  GetSheets,
  AddSmartList,
  GetLeads,
  GetUniqueColumns,
  GetCallLogs,
  DeleteList,
  AddLeadNote,
  AddLeadTag,
  DeleteLeadTag,
  GetLeadDetail,
  UpdateLeadStage,
  DeleteLead,
} from "../controllers/LeadsController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let LeadRouter = express.Router();

LeadRouter.post("/addLeads", verifyJwtToken, AddLeads);
LeadRouter.post("/deleteLead", verifyJwtToken, DeleteLead);
LeadRouter.post("/updateLeadStage", verifyJwtToken, UpdateLeadStage);
LeadRouter.get("/leadDetail", verifyJwtToken, GetLeadDetail);
LeadRouter.post("/addLeadNote", verifyJwtToken, uploadFiles, AddLeadNote);
LeadRouter.post("/addLeadTag", verifyJwtToken, uploadFiles, AddLeadTag);
LeadRouter.post("/deleteLeadTag", verifyJwtToken, uploadFiles, DeleteLeadTag);
LeadRouter.post("/addSmartList", verifyJwtToken, AddSmartList);
LeadRouter.post("/deleteList", verifyJwtToken, DeleteList);
LeadRouter.get("/getLeads", verifyJwtToken, uploadFiles, GetLeads);
LeadRouter.get("/getSheets", verifyJwtToken, uploadFiles, GetSheets);
LeadRouter.get("/callLogs", verifyJwtToken, GetCallLogs);
LeadRouter.get(
  "/getUniqueColumns",
  verifyJwtToken,
  uploadFiles,
  GetUniqueColumns
);

export default LeadRouter;
