// CheckCalendarAvailability

import express from "express";
import multer from "multer";
import { verifyJwtToken } from "../middleware/jwtmiddleware.js";
const uploadFiles = multer().fields([{ name: "media", maxCount: 1 }]);

import {
  CheckCalendarAvailability,
  GetKb,
  AddCalendar,
  ScheduleEvent,
} from "../controllers/actionController.js";

let actionRouter = express.Router();

// callRouter.post("/gen_summary", GenSummary);
actionRouter.get("/getCustomActionData", GetKb);
// getKb
actionRouter.get("/getKb", GetKb); // used by auto generated custom actions

actionRouter.get("/checkAvailability", CheckCalendarAvailability);
actionRouter.post("/addCalendar", verifyJwtToken, uploadFiles, AddCalendar);
actionRouter.post("/bookAppointment", ScheduleEvent);

export default actionRouter;
