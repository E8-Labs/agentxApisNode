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
  CadenceBookedCalls,
  CronRunCadenceCallsFirstBatch,
  CronRunCadenceCallsSubsequentStages,
} from "./controllers/cadeneController.js";
import {
  DownloadAndSaveCallRecordings,
  PhoneNumberCron,
} from "./controllers/twilioController.js";
import { SetOutcomeforpreviousCalls } from "./controllers/WebhookSynthflowController.js";

import { ReleaseNumberCron } from "./controllers/twilioController.js";
import { convertUTCToTimezone } from "./utils/dateutil.js";
import {
  AddNotification,
  NotificationCron,
} from "./controllers/NotificationController.js";
import { NotificationTypes } from "./models/user/NotificationModel.js";
import { ReChargeUserAccount } from "./controllers/PaymentController.js";
import { RemoveLock, TryToLockFile } from "./services/FileService.js";
import { ProcessTypes } from "./models/webhooks/cronLock.js";

// Release Number cron
const CronReleaseNumber = nodeCron.schedule("*/1 * * * *", ReleaseNumberCron);
CronReleaseNumber.start();

const CronDownloadAudioUrl = nodeCron.schedule(
  "*/5 * * * *",
  DownloadAndSaveCallRecordings
);
CronDownloadAudioUrl.start();
