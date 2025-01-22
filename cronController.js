import moment from "moment-timezone";
import axios from "axios";
import chalk from "chalk";
import nodemailer from "nodemailer";
import db from "./models/index.js";
// console.log(import.meta.url);
import nodeCron from "node-cron";

import dotenv from "dotenv";

dotenv.config();

import {
  CronRunCadenceCallsFirstBatch,
  CronRunCadenceCallsSubsequentStages,
} from "./controllers/cadeneController.js";
import { PhoneNumberCron } from "./controllers/twilioController.js";
import { SetOutcomeforpreviousCalls } from "./controllers/WebhookSynthflowController.js";

import { ReleaseNumberCron } from "./controllers/twilioController.js";
import { convertUTCToTimezone } from "./utils/dateutil.js";
import {
  AddNotification,
  NotificationCron,
} from "./controllers/NotificationController.js";
import { NotificationTypes } from "./models/user/NotificationModel.js";
import {
  RechargeFunction,
  ReChargeUserAccount,
} from "./controllers/PaymentController.js";

const CronRunCadenceCallsFirstBatchCron = nodeCron.schedule(
  "*/30 * * * * *",
  CronRunCadenceCallsFirstBatch
);
CronRunCadenceCallsFirstBatchCron.start();

const CronRunCadenceCallsSubsequentStagesCron = nodeCron.schedule(
  "*/1 * * * *",
  CronRunCadenceCallsSubsequentStages
);
CronRunCadenceCallsSubsequentStagesCron.start();

//Testing every min
const CronPhone = nodeCron.schedule("0 0 * * *", PhoneNumberCron);
CronPhone.start();

//Call status cron
const CronCallOutcome = nodeCron.schedule(
  "*/59 * * * * *",
  SetOutcomeforpreviousCalls
);
CronCallOutcome.start();

// Release Number cron
const CronReleaseNumber = nodeCron.schedule("*/10 * * * *", ReleaseNumberCron);
CronReleaseNumber.start();

const NotificationSendingCron = nodeCron.schedule(
  "*/5 * * * *", //"*/59 * * * * *",
  NotificationCron
);
NotificationSendingCron.start();

const RechargeCron = nodeCron.schedule("*/1 * * * *", RechargeFunction);
RechargeCron.start();
