import db from "./models/index.js";
// import S3 from "aws-sdk/clients/s3.js";
import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
// import twilio from 'twilio';
import moment from "moment-timezone";
import axios from "axios";
import chalk from "chalk";
import nodemailer from "nodemailer";
console.log(import.meta.url);
import nodeCron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

import UserProfileFullResource from "./resources/userProfileFullResource.js";
import { CadenceStatus } from "./models/pipeline/LeadsCadence.js";
import Pipeline from "./models/pipeline/pipeline.js";
import { calculateDifferenceInMinutes } from "./utils/dateutil.js";

//This will push 100 leads into the cadence every day. If 100 leads are pushed, it will not psuh any more
//Runs every 30 sec
export const CronRunCadenceCallsFirstBatch = async () => {
  //Find Cadences to run for leads in the initial State (New Lead)
  //Step-1 Find all leadCadences which are not completed. All leads which are pending should be pushed
  console.log("Running cron CronRunCadenceCallsFirstBatch");
  //Verify batch size limit is not reached
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0); // Set to start of the day

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999); // Set to end of the day

  // Query to calculate the count
  let count = await db.LeadCadence.count({
    where: {
      callTriggerTime: {
        [db.Sequelize.Op.between]: [startOfToday, endOfToday], // Filter for today's date
      },
    },
  });
  if (count >= 20) {
    console.log("Batch size limit reached so will push calls tomorrow");
    return;
  }

  let leadCadence = await db.LeadCadence.findAll({
    where: {
      status: CadenceStatus.Pending,
      callTriggerTime: { [db.Sequelize.Op.is]: null }, // Check if callTriggerTime is null
    },
    limit: 20, // Limit the batch size to 2
  });

  console.log(`Found ${leadCadence.length} leads to start batch calls`);
  if (leadCadence.length == 0) {
    console.log(`Found No new leads to start batch calls today`);
    return;
  }

  for (let i = 0; i < leadCadence.length; i++) {
    let leadCad = leadCadence[i];
    let pipeline = await db.Pipeline.findByPk(leadCad.pipelineId);
    let lead = await db.LeadModel.findByPk(leadCad.leadId);
    let mainAgent = await db.MainAgentModel.findByPk(leadCad.mainAgentId);
    // console.log("Main Agent", mainAgent);
    let pipelineStageForLead = await db.PipelineStages.findByPk(leadCad.stage);
    // console.log(
    //   `Found Lead ${lead.firstName} at stage ${pipelineStageForLead.stageTitle} in Pipeline ${pipeline.title} Assigned to ${mainAgent.name}`
    // );
    // console.log("###############################################################################################################\n")
    //Since this would be the first stage lead, no calls have been sent to him as of now. We will not check
    //for last call time and wait for that amount of time

    let cadence = await db.PipelineCadence.findOne({
      where: {
        mainAgentId: mainAgent.id,
        pipelineId: pipeline.id,
        stage: leadCad.stage,
      },
    });

    // console.log(
    //   `Found Cadence ${cadence.id} for  agent ${mainAgent.id} at stage ${leadCad.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
    // );

    //Get Call Schedule for the lead Stage
    let callCadence = await db.CadenceCalls.findAll({
      where: {
        pipelineCadenceId: cadence.id,
      },
    });

    console.log("Found schedule", callCadence.length);

    //decide should we send call or not?
    //If initial call then check when the leadCadence was created and find the difference between lead cadence creation & Now.
    //If the distance is greater than the next call duration then make that call.

    //Checking number of calls sent to this lead
    let calls = await db.LeadCallsSent.findAll({
      where: {
        leadCadenceId: leadCad.id,
      },
      order: [["createdAt", "ASC"]],
    });
    if (calls && calls.length > 0) {
      console.log("Calls sent to this lead ", calls.length);
      //Get the next call from callCadence to be sent
      console.log("Next call to be sent is ", calls.length + 1);
      let lastCall = calls[calls.length - 1];
      let nextCadenceCall = callCadence[calls.length];

      let waitTime =
        Number(nextCadenceCall.waitTimeDays) * 24 * 60 +
        Number(nextCadenceCall.waitTimeHours) * 60 +
        Number(nextCadenceCall.waitTimeMinutes);
      console.log(`Total wait time for next call  ${waitTime} min`);

      let diff = calculateDifferenceInMinutes(lastCall.callTriggerTime); // in minutes
      console.log(`Diff is ${diff}`);
      if (diff > waitTime) {
        console.log("Next call should be placed");
        let sent = await db.LeadCallsSent.create({
          leadId: leadCad.leadId,
          leadCadenceId: leadCad.id,
          callTriggerTime: new Date(),
          synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCad.id}-${leadCad.stage}`,
          stage: leadCad.stage,
        });
      } else {
        console.log("Difference is small so next call can not be placed");
      }
    } else {
      console.log("No call already sent");

      //send call after checking whether the first call wait time is already passed
      //calculate time with initial leadCadence creation and now.
      let sent = await db.LeadCallsSent.create({
        leadId: leadCad.leadId,
        leadCadenceId: leadCad.id,
        callTriggerTime: new Date(),
        synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCad.id}-${leadCad.stage}`,
        stage: leadCad.stage,
        status: "",
      });

      if (sent) {
        //set the lead cadence status to Started so that next time it don't get pushed to the funnel
        leadCad.callTriggerTime = new Date();
        leadCad.status = CadenceStatus.Started;
        let saved = await leadCad.save();
      }
    }
  }
};

export const CronRunCadenceCallsSubsequentStages = async () => {
  console.log("Running cron CronRunCadenceCallsSubsequentStages");
  //Find Cadences to run for leads in the initial State (New Lead)
  //Step-1 Find all leadCadences which are not completed. All leads which are Started should be pushed

  let leadCadence = await db.LeadCadence.findAll({
    where: {
      status: CadenceStatus.Started,
    },
    limit: 50, // Limit the batch size to 2
  });

  console.log(
    `CronRunCadenceCallsSubsequentStages: Found ${leadCadence.length} leads to start subsequent calls`
  );
  if (leadCadence.length == 0) {
    console.log(
      `CronRunCadenceCallsSubsequentStages: Found No new leads to start subsequent calls today`
    );
    return;
  }

  for (let i = 0; i < leadCadence.length; i++) {
    let leadCad = leadCadence[i];
    let pipeline = await db.Pipeline.findByPk(leadCad.pipelineId);
    let lead = await db.LeadModel.findByPk(leadCad.leadId);
    let mainAgent = await db.MainAgentModel.findByPk(leadCad.mainAgentId);
    // console.log("Main Agent", mainAgent);
    let pipelineStageForLead = await db.PipelineStages.findByPk(leadCad.stage);
    // console.log(
    //   `Found Lead ${lead.firstName} at stage ${pipelineStageForLead.stageTitle} in Pipeline ${pipeline.title} Assigned to ${mainAgent.name}`
    // );
    // console.log("###############################################################################################################\n")
    //Since this would be the first stage lead, no calls have been sent to him as of now. We will not check
    //for last call time and wait for that amount of time

    let cadence = await db.PipelineCadence.findOne({
      where: {
        mainAgentId: mainAgent.id,
        pipelineId: pipeline.id,
        stage: leadCad.stage,
      },
    });
    if (!cadence) {
      console.log(
        "CronRunCadenceCallsSubsequentStages: Cadence have no active leads"
      );
      return;
    }

    // console.log(
    //   `Found Cadence ${cadence.id} for  agent ${mainAgent.id} at stage ${leadCad.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
    // );

    //Get Call Schedule for the lead Stage
    let callCadence = await db.CadenceCalls.findAll({
      where: {
        pipelineCadenceId: cadence.id,
      },
    });

    console.log(
      "CronRunCadenceCallsSubsequentStages: Found schedule",
      callCadence.length
    );

    //decide should we send call or not?
    //If initial call then check when the leadCadence was created and find the difference between lead cadence creation & Now.
    //If the distance is greater than the next call duration then make that call.

    //Checking number of calls sent to this lead
    let calls = await db.LeadCallsSent.findAll({
      where: {
        leadCadenceId: leadCad.id,
        stage: leadCad.stage,
      },
      order: [["createdAt", "ASC"]],
    });
    let lastCall = calls[calls.length - 1];
    if (calls && calls.length > 0) {
      console.log(
        "CronRunCadenceCallsSubsequentStages: Calls sent to this lead ",
        calls.length
      );
      if (calls.length == callCadence.length) {
        //Don't send calls
        //All calls are sent to this lead already so we have to determine whether we push it to the next stage or do what?
        //We can either move the lead cadence to the next stage or leave it to the outcome of the call.
        //If we want the outcome to be determined based on call log first then wait for call log else
        console.log(
          "CronRunCadenceCallsSubsequentStages: Don't send calls. Already sent calls for this lead cadence"
        );
        let diff = calculateDifferenceInMinutes(lastCall.callTriggerTime); // in minutes
        console.log(`CronRunCadenceCallsSubsequentStages: Diff is ${diff}`);
        if (diff > 5) {
          //60 * 24
          // greater than total minutes in a day = 60 * 24
          //move to next stage for now
          console.log(
            "CronRunCadenceCallsSubsequentStages: Moving lead to new stage | last call duration exceeded. "
          );
          leadCad.stage = cadence.moveToStage;
          let saved = await leadCad.save();
          console.log(
            "CronRunCadenceCallsSubsequentStages: Moved one lead to new stage "
          );
        }
        // return;
      } else {
        //Get the next call from callCadence to be sent
        console.log(
          "CronRunCadenceCallsSubsequentStages: Next call to be sent is ",
          calls.length + 1
        );

        let nextCadenceCall = callCadence[calls.length];

        let waitTime =
          Number(nextCadenceCall.waitTimeDays) * 24 * 60 +
          Number(nextCadenceCall.waitTimeHours) * 60 +
          Number(nextCadenceCall.waitTimeMinutes);
        console.log(
          `CronRunCadenceCallsSubsequentStages: Total wait time for next call  ${waitTime} min`
        );

        let diff = calculateDifferenceInMinutes(lastCall.callTriggerTime); // in minutes
        console.log(`CronRunCadenceCallsSubsequentStages: Diff is ${diff}`);
        if (diff > waitTime) {
          console.log(
            "CronRunCadenceCallsSubsequentStages: Next call should be placed"
          );
          let sent = await db.LeadCallsSent.create({
            leadId: leadCad.leadId,
            leadCadenceId: leadCad.id,
            callTriggerTime: new Date(),
            synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCad.id}-${leadCad.stage}`,
            stage: leadCad.stage,
            status: "",
          });
          //+ 1 because one new call is sent just now
          if (calls.length + 1 == callCadence.length) {
            // we will not move the lead to new stage after we setup webhook from synthflow.
            //There we will add this logic. This is just for testing now.
            console.log(
              "CronRunCadenceCallsSubsequentStages: Moving lead to new stage "
            );
            leadCad.stage = cadence.moveToStage;
            let saved = await leadCad.save();
            console.log(
              "CronRunCadenceCallsSubsequentStages: Moved one lead to new stage "
            );
          }
        } else {
          console.log(
            "CronRunCadenceCallsSubsequentStages: Difference is small so next call can not be placed"
          );
        }
      }
    } else {
      //This will never be satisfied for this cron
      console.log(
        "CronRunCadenceCallsSubsequentStages: Started: No call already sent"
      );

      //send call after checking whether the first call wait time is already passed
      //calculate time with initial leadCadence creation and now.
      let sent = await db.LeadCallsSent.create({
        leadId: leadCad.leadId,
        leadCadenceId: leadCad.id,
        callTriggerTime: new Date(),
        synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCad.id}-${leadCad.stage}`,
        stage: leadCad.stage,
        status: "",
      });

      if (sent) {
        //set the lead cadence status to Started so that next time it don't get pushed to the funnel
        leadCad.callTriggerTime = new Date();
        leadCad.status = CadenceStatus.Started;
        let saved = await leadCad.save();
        console.log("CronRunCadenceCallsSubsequentStages: CallSent now");
      }
    }
  }
};

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
