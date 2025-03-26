import express from "express";
import multer from "multer";

import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
import {
  AddCalendarCalDotCom,
  ScheduleEvent,
  CheckCalendarAvailability,
  GetUserConnectedCalendars,
  GetCalendarSchedule,
  DeleteCalendarApi,
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
  uploadFiles,
  verifyJwtTokenWithTeam,

  AddCalendarCalDotCom
);
CalendarRouter.post(
  "/deleteCalendar",
  uploadFiles,
  verifyJwtTokenWithTeam,

  DeleteCalendarApi
);
CalendarRouter.get("/getAvailability", uploadFiles, CheckCalendarAvailability);
CalendarRouter.post("/schedule", uploadFiles, ScheduleEvent);
CalendarRouter.get(
  "/calendars",
  uploadFiles,
  verifyJwtTokenWithTeam,

  GetUserConnectedCalendars
);

CalendarRouter.post(
  "/getScheduleForCalendar",
  uploadFiles,
  verifyJwtTokenWithTeam,

  GetCalendarSchedule
);

export default CalendarRouter;
