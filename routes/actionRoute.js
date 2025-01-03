// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtTokenWithTeam } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import {
  CheckCalendarAvailability,
  GetKb,
  AddCalendar,
  ScheduleEvent,
} from "../controllers/calendarController.js";

let actionRouter = express.Router();

// callRouter.post("/gen_summary", GenSummary);
actionRouter.get("/getCustomActionData", GetKb);
// getKb
actionRouter.get("/getKb", GetKb); // used by auto generated custom actions

actionRouter.get("/checkAvailability", CheckCalendarAvailability);
actionRouter.post(
  "/addCalendar",
  verifyJwtTokenWithTeam,
  uploadFiles,
  AddCalendar
);
actionRouter.post("/bookAppointment", ScheduleEvent);

export default actionRouter;
