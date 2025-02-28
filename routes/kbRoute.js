// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import {
  AddKnowledgebase,
  DeleteKnowledgebase,
  GetKnowledgebase,
  SearchKb,
} from "../controllers/KbController.js";

let kbRouter = express.Router();

kbRouter.get("/getKnowledgebase", verifyJwtTokenWithTeam, GetKnowledgebase);

kbRouter.get("/searchKb", SearchKb);
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
