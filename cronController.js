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
import { AddNotification } from "./controllers/NotificationController.js";
import { NotificationTypes } from "./models/user/NotificationModel.js";

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
  "*/30 * * * * *",
  async () => {
    let date = new Date().toISOString();
    console.log("Current time server ", date);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Set to start of day

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // Set to end of day

    let notSent = await db.DailyNotificationModel.findAll({
      where: {
        createdAt: {
          [Op.gte]: startOfToday, // Greater than or equal to the start of the day
          [Op.lt]: endOfToday, // Less than the end of the day
        },
      },
    });

    let userIds = [];
    if (notSent && notSent.length > 0) {
      userIds = notSent.map((not) => not.userId);
    }

    let users = await db.User.findAll({
      where: {
        userId: {
          [db.Sequelize.Op.notIn]: userIds,
        },
      },
    });

    for (const u of users) {
      let timeZone = u.timeZone || "America/Los_Angeles";
      console.log("User Time zone is ", timeZone);
      if (timeZone) {
        let timeInUserTimeZone = convertUTCToTimezone(date, timeZone);
        console.log("TIme in user timezone", timeInUserTimeZone);
        const userDateTime = DateTime.fromFormat(
          timeInUserTimeZone,
          "yyyy-MM-dd HH:mm:ss",
          { zone: timeZone }
        );
        const ninePM = userDateTime.set({ hour: 21, minute: 0, second: 0 });

        if (userDateTime > ninePM) {
          console.log(
            `It's after 9 PM in ${timeZone}. Current time: ${timeInUserTimeZone}`
          );
          //send notification
          try {
            await db.DailyNotificationModel.create({
              userId: u.id,
            });
            await AddNotification(
              u,
              null,
              NotificationTypes.TotalHotlead,
              null,
              null,
              null
            );
          } catch (error) {
            console.log("Error adding not ");
          }
        } else {
          console.log(
            `It's not yet 9 PM in ${timeZone}. Current time: ${timeInUserTimeZone}`
          );
        }
      }
    }
  }
);
NotificationSendingCron.start();
