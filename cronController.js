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
import { ReChargeUserAccount } from "./controllers/PaymentController.js";

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

//Call status cron
const CronCallOutcome = nodeCron.schedule(
  "*/59 * * * * *",
  SetOutcomeforpreviousCalls
);
CronCallOutcome.start();

//Release Number cron
const CronReleaseNumber = nodeCron.schedule("*/10 * * * *", ReleaseNumberCron);
CronReleaseNumber.start();

const NotificationSendingCron = nodeCron.schedule(
  "*/59 * * * * *", //"*/59 * * * * *",
  NotificationCron
);
NotificationSendingCron.start();

// const RechargeCron = nodeCron.schedule("*/50 * * * * *", async () => {
//   console.log("Cron Cancel plan or rechrage");
//   let date7DaysAgo = new Date();
//   date7DaysAgo.setDate(date7DaysAgo.getDate() - 7); // Correctly subtract 7 days from the current date
//   let users = await db.User.findAll({
//     where: {
//       createdAt: {
//         [db.Sequelize.Op.gt]: date7DaysAgo,
//       },
//     },
//   });
//   if (users && users.length > 0) {
//     for (const u of users) {
//       try {
//         ReChargeUserAccount(u);
//       } catch (error) {
//         console.log("error rechargign or cancelling trial");
//       }
//     }
//   }

//   // ReChargeUserAccount
// });
// RechargeCron.start();

// NotificationCron();

// function CronRecharge
