import moment from "moment-timezone";
import axios from "axios";
import chalk from "chalk";
import nodemailer from "nodemailer";
// console.log(import.meta.url);
import nodeCron from "node-cron";

import dotenv from "dotenv";

dotenv.config();

import {
  CronRunCadenceCallsFirstBatch,
  CronRunCadenceCallsSubsequentStages,
} from "./controllers/cadeneController.js";
import { PhoneNumberCron } from "./controllers/twilioController.js";

//Concurrent Calls- Set Limit to 100
//https://docs.synthflow.ai/docs/concurrency-calls

//This will push 100 leads into the cadence every day. If 100 leads are pushed, it will not psuh any more
//Runs every 30 sec

// CronRunCadenceCallsFirstBatch();

// CronRunCadenceCallsSubsequentStages();

const CronRunCadenceCallsFirstBatchCron = nodeCron.schedule(
  "*/1 * * * *",
  CronRunCadenceCallsFirstBatch
);
CronRunCadenceCallsFirstBatchCron.start();

const CronRunCadenceCallsSubsequentStagesCron = nodeCron.schedule(
  "*/1 * * * *",
  CronRunCadenceCallsSubsequentStages
);
CronRunCadenceCallsSubsequentStagesCron.start();

// Schedule a cron job to run every day at midnight
// cron.schedule("0 0 * * *", PhoneNumberCron);

//Testing every min
const CronPhone = nodeCron.schedule("0 0 * * *", PhoneNumberCron);
CronPhone.start();
// PhoneNumberCron();
