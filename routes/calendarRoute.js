import express from "express";
import multer from "multer";

import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
import {
  AddCalendarCalDotCom,
  ScheduleEvent,
  CheckCalendarAvailability,
} from "../controllers/calendarController.js";

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
  AddCalendarCalDotCom
);
CalendarRouter.post(
  "/getAvailability",
  verifyJwtToken,
  uploadFiles,
  CheckCalendarAvailability
);
CalendarRouter.post("/schedule", uploadFiles, ScheduleEvent);

export default CalendarRouter;
