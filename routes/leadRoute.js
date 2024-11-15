import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  AddLeads,
  GetSheets,
  GetLeads,
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
LeadRouter.get("/getLeads", verifyJwtToken, uploadFiles, GetLeads);
LeadRouter.get("/getSheets", verifyJwtToken, uploadFiles, GetSheets);

export default LeadRouter;
