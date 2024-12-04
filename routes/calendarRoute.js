import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import { CreateCalendar } from "../controllers/calendarController.js";

import { GenerateApiKey, GetMyApiKeys } from "../controllers/apiController.js";

const uploadFiles = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "driver_license", maxCount: 1 },
]);

const uploadMedia = multer().fields([
  { name: "media", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

let CalendarRouter = express.Router();

CalendarRouter.post(
  "/createCalendar",
  verifyJwtToken,
  uploadFiles,
  CreateCalendar
);

export default CalendarRouter;
