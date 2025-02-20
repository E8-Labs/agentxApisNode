// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import {
  AddKnowledgebase,
  DeleteKnowledgebase,
  GetKnowledgebase,
} from "../controllers/KbController.js";

let kbRouter = express.Router();

kbRouter.get("/getKnowledgebase", verifyJwtTokenWithTeam, GetKnowledgebase);
kbRouter.post(
  "/addKnowledgebase",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AddKnowledgebase
);

kbRouter.post(
  "/deleteKnowledgebase",
  verifyJwtTokenWithTeam,
  uploadFiles,
  DeleteKnowledgebase
);
export default kbRouter;
