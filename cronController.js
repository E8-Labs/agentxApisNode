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
import { RemoveLock, TryToLockFile } from "./services/FileService.js";
import { ProcessTypes } from "./models/webhooks/cronLock.js";

const CronRunCadenceCallsFirstBatchCron = nodeCron.schedule(
  "*/10 * * * * *",
  async () => {
    try {
      // Check if the lock file exists
      let cronRunning = await db.CronLockTable.findOne({
        where: { process: ProcessTypes.BatchCron },
      });

      if (cronRunning) {
        console.log("Cron is already running");
        return;
      }
      let created = await db.CronLockTable.create({
        process: ProcessTypes.BatchCron,
      });
      // Execute the job function
      console.log("Calling the cron function");
      await CronRunCadenceCallsFirstBatch();
      // await runCronJob();
      console.log("Cron completed");
      await db.CronLockTable.destroy({
        where: {
          process: ProcessTypes.BatchCron,
        },
      });
    } catch (error) {
      console.log(error);
      console.error("Error during task execution:", error.message);
    } finally {
      // Remove the lock file
    }
  }
);
CronRunCadenceCallsFirstBatchCron.start();

const CronRunCadenceCallsSubsequentStagesCron = nodeCron.schedule(
  "*/1 * * * *",
  async () => {
    try {
      // Check if the lock file exists
      let cronRunning = await db.CronLockTable.findOne({
        where: { process: ProcessTypes.SubsequentCron },
      });

      if (cronRunning) {
        console.log("Sub: Cron is already running");
        return;
      } else {
        let created = await db.CronLockTable.create({
          process: ProcessTypes.SubsequentCron,
        });
        // Execute the job function
        console.log("Calling the cron function");
        await CronRunCadenceCallsSubsequentStages();
        await db.CronLockTable.destroy({
          where: {
            process: ProcessTypes.SubsequentCron,
          },
        });
      }

      // await runCronJob();
    } catch (error) {
      console.log(error);
      console.error("Error during task execution:", error.message);
    } finally {
      // Remove the lock file
    }
  }
);
CronRunCadenceCallsSubsequentStagesCron.start();

//Booked Calls
const CronRunCadenceCallsBookingCron = nodeCron.schedule(
  "*/5 * * * *",
  async () => {
    try {
      // Check if the lock file exists
      let cronRunning = await db.CronLockTable.findOne({
        where: { process: ProcessTypes.BookingCron },
      });

      if (cronRunning) {
        console.log("Booking Cron is already running");
        return;
      }
      let created = await db.CronLockTable.create({
        process: ProcessTypes.BookingCron,
      });
      // Execute the job function
      console.log("Calling the Booking cron function");
      await CadenceBookedCalls();
      // await runCronJob();
      console.log("Booking Cron completed");
      await db.CronLockTable.destroy({
        where: {
          process: ProcessTypes.BookingCron,
        },
      });
    } catch (error) {
      console.log(error);
      console.error("Error during task execution:", error.message);
    } finally {
      // Remove the lock file
    }
  }
);
CronRunCadenceCallsBookingCron.start();

//Testing every min
const CronPhone = nodeCron.schedule("0 0 * * *", PhoneNumberCron);
CronPhone.start();

//Call status cron
const CronCallOutcome = nodeCron.schedule(
  "*/30 * * * * *",
  SetOutcomeforpreviousCalls
);
CronCallOutcome.start();

// Release Number cron
const CronReleaseNumber = nodeCron.schedule("*/10 * * * *", ReleaseNumberCron);
CronReleaseNumber.start();

const NotificationSendingCron = nodeCron.schedule(
  "*/3 * * * *", //"*/59 * * * * *",
  NotificationCron
);
NotificationSendingCron.start();

const RechargeCron = nodeCron.schedule("*/1 * * * *", async () => {
  try {
    // Check if the lock file exists
    let cronRunning = await db.CronLockTable.findOne({
      where: { process: ProcessTypes.RechargeCron },
    });

    if (cronRunning) {
      console.log("Cron is already running");
      return;
    }
    let created = await db.CronLockTable.create({
      process: ProcessTypes.RechargeCron,
    });
    // Execute the job function
    console.log("Calling the recharge cron function");
    await RechargeFunction();
    // await runCronJob();
    console.log("Recharge Cron completed");
    await db.CronLockTable.destroy({
      where: {
        process: ProcessTypes.RechargeCron,
      },
    });
  } catch (error) {
    console.log(error);
    console.error("Error during task execution:", error.message);
    await db.CronLockTable.destroy({
      where: {
        process: ProcessTypes.RechargeCron,
      },
    });
  } finally {
    // Remove the lock file
  }
});
RechargeCron.start();
