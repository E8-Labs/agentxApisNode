import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
  LoadRegistrationData,
  GenerateDefaultSellerBuyerKycIE,
  GetRandomAgents,
} from "../controllers/dataController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let DataRouter = express.Router();

DataRouter.get("/loadDefaualtData", LoadRegistrationData);
DataRouter.get("/agentsList", GetRandomAgents);
DataRouter.post("/createDefaultIEs", GenerateDefaultSellerBuyerKycIE);

export default DataRouter;
