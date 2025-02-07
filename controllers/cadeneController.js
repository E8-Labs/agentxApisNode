import db from "../models/index.js";
// import S3 from "aws-sdk/clients/s3.js";

// Twilio setup
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );
import { WriteToFile } from "../services/FileService.js";
import dotenv from "dotenv";

dotenv.config();
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";

import { calculateDifferenceInMinutes } from "../utils/dateutil.js";
import { addCallTry, MakeACall } from "../controllers/synthflowController.js";
import { BatchStatus } from "../models/pipeline/CadenceBatchModel.js";
import { constants } from "../constants/constants.js";
import {
  GetAgentPipeline,
  GetAgentsWorkingOnStage,
  GetPipelineStageWithIdentifier,
} from "../utils/agentUtility.js";

//Concurrent Calls- Set Limit to 100
//https://docs.synthflow.ai/docs/concurrency-calls

const simulate = false; //process.env.CronEnvironment == "Sandbox" ? true : false;
// const failedSimulation = true; // to simulate failed calls and then mark them as errored on third try
console.log("Simulate ", simulate);
const AvgCallTimeSeconds = 3 * 60; //seconds
const MaxLeadsToFetch = 5000;

async function getPayingUserLeadIds(user = null) {
  let usersWithMinutesRemaining = await db.User.findAll({
    where: {
      totalSecondsAvailable: {
        [db.Sequelize.Op.gte]: 2 * 60, // gt or equal
      },
    },
  });
  if (user) {
    usersWithMinutesRemaining = [user];
  }
  let userIds =
    usersWithMinutesRemaining && usersWithMinutesRemaining.length > 0
      ? usersWithMinutesRemaining.map((user) => user.id)
      : [];
  console.log("user ids ", userIds);
  let leads = await db.LeadModel.findAll({
    where: {
      userId: {
        [db.Sequelize.Op.in]: userIds,
      },
    },
  });
  let leadIds = [];
  if (leads && leads.length > 0) {
    leadIds = leads.map((lead) => lead.id);
  }

  // for (let i = leadIds.length - 1; i > leadIds.length - 20; i--) {
  //   console.log("Lead Id: ", leadIds[i]);
  // }
  return leadIds;
}

export const CronRunCadenceCallsFirstBatch = async () => {
  //Find Cadences to run for leads in the initial State (New Lead)
  //Step-1 Find all leadCadences which are not completed. All leads which are pending should be pushed
  // WriteToFile("Running cron CronRunCadenceCallsFirstBatch");
  //Verify batch size limit is not reached
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0); // Set to start of the day

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999); // Set to end of the day

  const leadIds = await getPayingUserLeadIds(); //only fetch those users, whose minutes are above 2 min threshold
  // return;
  // console.log("Lead ids of paying users", JSON.stringify(leadIds));
  // let leadCadence = await db.LeadCadence.findAll({
  //   where: {
  //     status: CadenceStatus.Pending,
  //     callTriggerTime: { [db.Sequelize.Op.is]: null }, // Check if callTriggerTime is null
  //     leadId: {
  //       [db.Sequelize.Op.in]: leadIds,
  //     },
  //   },
  //   limit: 200,
  // });

  let leadCadence = await db.LeadCadence.findAll({
    where: {
      status: CadenceStatus.Pending,
      callTriggerTime: { [db.Sequelize.Op.is]: null }, // Check if callTriggerTime is null
      leadId: {
        [db.Sequelize.Op.in]: leadIds,
      },
    },
    include: [
      {
        model: db.CadenceBatchModel,
        required: true, // Ensures only leads with a valid batch are fetched
        where: {
          status: { [db.Sequelize.Op.ne]: BatchStatus.Paused }, // Exclude batches that are paused
        },
      },
    ],
    limit: MaxLeadsToFetch,
  });

  // console.log("LEad Cad", leadCadence)

  // WriteToFile(`Found ${leadCadence.length} leads to start batch calls`);
  // return;
  if (leadCadence.length == 0) {
    // WriteToFile(`FirstBatch: Found No new leads to start batch calls today`);
    return;
  }

  for (let i = 0; i < leadCadence.length; i++) {
    let leadCad = leadCadence[i];
    console.log(`LeadCad , ${leadCad.id} : Batch=${leadCad.batchId}`);
    // WriteToFile("Iteration", i);
    try {
      // let lead = await db.LeadModel.findOne(leadCad.leadId)
      let lead = await db.LeadModel.findByPk(leadCad.leadId);
      if (lead) {
        let user = await db.User.findByPk(lead.userId);
        //check the total number of ongoing calls atm
        let leadIds = await getPayingUserLeadIds(user);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        // console.log("Finding calls in lead ids ", JSON.stringify(leadIds));
        let calls = await db.LeadCallsSent.findAll({
          where: {
            leadId: {
              [db.Sequelize.Op.in]: leadIds,
            },
            duration: {
              [db.Sequelize.Op.eq]: null,
            },
            createdAt: {
              [db.Sequelize.Op.gte]: tenMinutesAgo, // Created within the last 10 minutes
            },
          },
        });

        // WriteToFile(
        //   user.id + `lead ${lead.id} Current ongoing calls `,
        //   calls.length
        // );
        //avg call time 3 min
        if (user.totalSecondsAvailable < calls.length * AvgCallTimeSeconds) {
          // WriteToFile("Wait for current ongoing calls then place next.");
          continue; //to the next call & don't place further calls for this user
        }
        // if(user.totalSecondsAvailable)
      }

      let batch = await db.CadenceBatchModel.findByPk(leadCad.batchId);
      if (!batch) {
        continue; // don't send cadence if not batched leadsCad calls because they were not added through assigning leads
      }
      const dbDate = new Date(batch?.startTime); // Date from the database
      const currentDate = new Date(); // Current date and time

      if (dbDate.getTime() >= currentDate.getTime()) {
        // console.log("The database date is greater than or equal to the current date.");
        // WriteToFile(
        //   `This cadence batch start time is in future,
        //   ${dbDate.getTime()}`
        // );
        // WriteToFile(`Current Date , ${currentDate.getTime()}`);
        continue;
      }
      // WriteToFile(`Calling Batch Status ", ${batch?.status}`);
      if (batch?.status != BatchStatus.Active) {
        // WriteToFile(`Cadence is paused for this batch", ${batch?.id}`);
        continue;
      }
      //Check calls sent for this batch
      let count = await db.LeadCadence.count({
        where: {
          callTriggerTime: {
            [db.Sequelize.Op.between]: [startOfToday, endOfToday], // Filter for today's date
          },
          batchId: leadCad.batchId,
        },
      });
      // WriteToFile(
      //   `${leadCad.batchId} Batch ${batch.batchSize} Calls: ${count}`
      // );
      if (count >= batch?.batchSize) {
        // WriteToFile("Batch size limit reached so will push calls tomorrow");
        continue;
      } else {
      }
      // WriteToFile(`Here 1`);
      let pipeline = await db.Pipeline.findByPk(leadCad.pipelineId);

      // WriteToFile(`Finding agent for ", ${leadCad.mainAgentId}`);
      let mainAgent = await db.MainAgentModel.findByPk(leadCad.mainAgentId);
      // console.log("Main Agent", mainAgent);
      let pipelineStageForLead = await db.PipelineStages.findByPk(lead.stage);
      // WriteToFile(
      //   `Found Lead ${lead?.firstName} at stage ${pipelineStageForLead?.stageTitle} in Pipeline ${pipeline?.title} Assigned to ${mainAgent?.name}`
      // );
      // console.log("###############################################################################################################\n")
      //Since this would be the first stage lead, no calls have been sent to him as of now. We will not check
      //for last call time and wait for that amount of time

      let cadence = await db.PipelineCadence.findOne({
        where: {
          mainAgentId: mainAgent.id,
          pipelineId: pipeline.id,
          stage: lead.stage,
        },
      });

      if (!cadence) {
        // WriteToFile(
        //   `No Cadence Found for  agent ${mainAgent.id} at stage ${lead.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
        // );
        continue;
      }
      // WriteToFile(
      //   `Found Cadence ${cadence.id} for  agent ${mainAgent.id} at stage ${leadCad.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
      // );
      //Get Call Schedule for the lead Stage
      let callCadence = await db.CadenceCalls.findAll({
        where: {
          pipelineCadenceId: cadence.id,
        },
      });

      // WriteToFile(`Found schedule", ${callCadence.length}`);

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
        if (callCadence.length == calls.length) {
          leadCad.status = CadenceStatus.Started;
          leadCad.callTriggerTime = new Date();
          await leadCad.save();
          //Don't send anymore calls and set the status to Started. This happened because of an error
          continue;
        }
        // WriteToFile(`Calls sent to this lead ", ${calls.length}`);
        //Get the next call from callCadence to be sent
        // WriteToFile("Next call to be sent is ", calls.length + 1);
        let lastCall = calls[calls.length - 1];
        let nextCadenceCall = callCadence[calls.length];

        let waitTime =
          Number(nextCadenceCall.waitTimeDays) * 24 * 60 +
          Number(nextCadenceCall.waitTimeHours) * 60 +
          Number(nextCadenceCall.waitTimeMinutes);
        // WriteToFile(`Total wait time for next call  ${waitTime} min`);

        let diff = calculateDifferenceInMinutes(lastCall.createdAt); // in minutes
        // WriteToFile(`Diff is ${diff}`);
        let agent = await db.AgentModel.findOne({
          where: {
            mainAgentId: leadCad.mainAgentId,
            agentType: "outbound",
          },
        });
        if (diff * 60 >= waitTime * 60 - 10) {
          // WriteToFile("Next call should be placed as wait time is over");
          try {
            //check the call tries for this leadCadence for this stage
            let tries = await db.LeadCallTriesModel.count({
              where: {
                leadCadenceId: leadCad.id,
                stage: lead.stage,
                mainAgentId: mainAgent.id,
                status: "error",
              },
            });
            // WriteToFile(
            //   `Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
            // );

            if (tries < 3) {
              let called = await MakeACall(leadCad, simulate, calls, batch.id);
            } else {
              //set cad errored
              leadCad.status = CadenceStatus.Errored;
              let saved = await leadCad?.save();

              lead.stage = null;
              await lead.save();
            }
            //if you want to simulate
            //let called = await MakeACall(leadCad, true, calls);
          } catch (error) {
            // WriteToFile(`Error Sending Call , ${error}`);
          }
        } else {
          // WriteToFile("Difference is small so next call can not be placed");
        }
      } else {
        // WriteToFile("No call already sent");

        //send call after checking whether the first call wait time is already passed
        //calculate time with initial leadCadence creation and now.
        let agent = await db.AgentModel.findOne({
          where: {
            mainAgentId: leadCad.mainAgentId,
            agentType: "outbound",
          },
        });
        try {
          let tries = await db.LeadCallTriesModel.count({
            where: {
              leadCadenceId: leadCad.id,
              stage: lead.stage,
              mainAgentId: mainAgent.id,
              status: "error",
            },
          });
          // WriteToFile(
          //   `Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
          // );
          if (tries < 3) {
            let called = await MakeACall(leadCad, simulate, calls, batch.id);
            // WriteToFile("First Call initiated");
            if (called.status) {
              //set the lead cadence status to Started so that next time it don't get pushed to the funnel
              // leadCad.callTriggerTime = new Date();
              // leadCad.status = CadenceStatus.Started;
              let updated = await db.LeadCadence.update(
                {
                  status: CadenceStatus.Started,
                  callTriggerTime: new Date(),
                },
                {
                  where: {
                    batchId: leadCad.batchId,
                    leadId: leadCad.leadId,
                  },
                }
              );
              // let saved = await leadCad.save();
            }
          } else {
            //set cad errored
            leadCad.status = CadenceStatus.Errored;
            let saved = await leadCad?.save();

            lead.stage = null;
            await lead.save();
          }

          //if you want to simulate
          //let called = await MakeACall(leadCad, true, calls);
        } catch (error) {
          console.log("Error Sending Call ", error);
        }
      }
    } catch (error) {
      console.log("Exception For Loop ", error);
    }
  }
};

export const CronRunCadenceCallsSubsequentStages = async () => {
  // WriteToFile(
  //   "CronRunCadenceCallsSubsequentStages: Running cron CronRunCadenceCallsSubsequentStages"
  // );
  //Find Cadences to run for leads in the initial State (New Lead)
  //Step-1 Find all leadCadences which are not completed. All leads which are Started should be pushed
  const leadIds = await getPayingUserLeadIds(); //only fetch those users, whose minutes are above 2 min threshold
  // let leadCadence = await db.LeadCadence.findAll({
  //   where: {
  //     status: CadenceStatus.Started,
  //     batchId: {
  //       [db.Sequelize.Op.ne]: null,
  //     },
  //     leadId: {
  //       [db.Sequelize.Op.in]: leadIds,
  //     },
  //   },
  //   limit: 50, // Limit the batch size to 2
  // });
  let leadCadence = await db.LeadCadence.findAll({
    where: {
      status: CadenceStatus.Started,
      batchId: { [db.Sequelize.Op.ne]: null }, // Check if batchId is null
      leadId: {
        [db.Sequelize.Op.in]: leadIds,
      },
    },
    include: [
      {
        model: db.CadenceBatchModel,
        required: true, // Ensures only leads with a valid batch are fetched
        where: {
          status: { [db.Sequelize.Op.ne]: BatchStatus.Paused }, // Exclude batches that are paused
        },
      },
    ],
    limit: MaxLeadsToFetch,
  });
  let newLeads = [];

  for (const l of leadCadence) {
    // WriteToFile(
    //   `CronRunCadenceCallsSubsequentStages:Lead Cad Line 270 , ${l.id}`
    // );
    let mainAgentId = l.mainAgentId;
    //check if this agent isa ctive in lead's current stage
    let lead = await db.LeadModel.findByPk(l.leadId);
    if (lead) {
      let user = await db.User.findByPk(lead.userId);
      //check the total number of ongoing calls atm
      let leadIds = await getPayingUserLeadIds(user);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      // console.log("Finding calls in lead ids ", JSON.stringify(leadIds));
      let calls = await db.LeadCallsSent.findAll({
        where: {
          leadId: {
            [db.Sequelize.Op.in]: leadIds,
          },
          duration: {
            [db.Sequelize.Op.eq]: null,
          },
          createdAt: {
            [db.Sequelize.Op.gte]: tenMinutesAgo, // Created within the last 10 minutes
          },
        },
      });

      // WriteToFile(
      //   user.id +
      //     `lead ${lead.id} Current ongoing calls ,
      //   ${calls.length}`
      // );
      //avg call time 3 min
      if (user.totalSecondsAvailable < calls.length * AvgCallTimeSeconds) {
        // WriteToFile("Wait for current ongoing calls then place next.");
        continue; //to the next call & don't place further calls for this user
      }
      // if(user.totalSecondsAvailable)
    }

    let leadStage = lead.stage;
    let pCad = await db.PipelineCadence.findOne({
      where: {
        pipelineId: l.pipelineId,
        stage: leadStage,
        mainAgentId: mainAgentId,
      },
    });
    if (pCad) {
      // WriteToFile(
      //   `CronRunCadenceCallsSubsequentStages:Pipe Cad Line 283 ",
      //   ${pCad.id}`
      // );
      // WriteToFile(
      //   "CronRunCadenceCallsSubsequentStages:This leadCad has active cadence rn"
      // );
      newLeads.push(l);
    }
  }

  // WriteToFile(
  //   `CronRunCadenceCallsSubsequentStages: Before Filter Found ${leadCadence.length} leads to start subsequent calls`
  // );
  leadCadence = newLeads;
  // WriteToFile(
  //   `CronRunCadenceCallsSubsequentStages: After Filter Found ${leadCadence.length} leads to start subsequent calls`
  // );
  // return;
  if (leadCadence.length == 0) {
    // WriteToFile(
    //   `CronRunCadenceCallsSubsequentStages: Found No new leads to start subsequent calls today`
    // );
    return;
  } else {
    console.log("CronRunCadenceCallsSubsequentStages:Leads found ");
    leadCadence.map((item) => {
      // WriteToFile(
      //   `CronRunCadenceCallsSubsequentStages:Lead ID ", ${item.leadId}`
      // );
      // WriteToFile(`CronRunCadenceCallsSubsequentStages:Cad ID ", ${item.id}`);
      // WriteToFile(
      //   `CronRunCadenceCallsSubsequentStages:Batch ID ",
      //   ${item.batchId}`
      // );
    });
  }

  for (let i = 0; i < leadCadence.length; i++) {
    try {
      // console.log(
      //   `CronRunCadenceCallsSubsequentStages:______________________ Iteration ${i} Start ______________________`
      // );
      let leadCad = leadCadence[i];
      let pipeline = await db.Pipeline.findByPk(leadCad.pipelineId);
      let lead = await db.LeadModel.findByPk(leadCad.leadId);
      let mainAgent = await db.MainAgentModel.findByPk(leadCad.mainAgentId);
      // console.log("Main Agent", mainAgent);
      let pipelineStageForLead = await db.PipelineStages.findByPk(lead.stage);
      // console.log(
      //   `Found Lead ${lead.firstName} at stage ${pipelineStageForLead.stageTitle} in Pipeline ${pipeline.title} Assigned to ${mainAgent.name}`
      // );
      // console.log("###############################################################################################################\n")
      //Since this would be the first stage lead, no calls have been sent to him as of now. We will not check
      //for last call time and wait for that amount of time

      let batch = await db.CadenceBatchModel.findByPk(leadCad.batchId);
      // WriteToFile(
      //   `Trying to find batch start time for leadCad", ${leadCad.id}`
      // );
      const dbDate = new Date(batch.startTime); // Date from the database
      const currentDate = new Date(); // Current date and time

      // WriteToFile(
      //   `CronRunCadenceCallsSubsequentStages:Batch Start Time ${batch.id} ,
      //   ${dbDate.getTime()}`
      // );
      // WriteToFile(
      //   `CronRunCadenceCallsSubsequentStages:Current Time ",
      //   ${currentDate.getTime()}`
      // );
      if (dbDate.getTime() >= currentDate.getTime()) {
        // console.log("The database date is greater than or equal to the current date.");
        // WriteToFile(
        //   `CronRunCadenceCallsSubsequentStages:This cadence ${batch.id} batch start time is in future`,
        //   dbDate.getTime()
        // );
        // WriteToFile(
        //   "CronRunCadenceCallsSubsequentStages:Current Date ",
        //   currentDate.getTime()
        // );
        continue;
      }

      if (batch.status != BatchStatus.Active) {
        // WriteToFile(
        //   "CronRunCadenceCallsSubsequentStages: Cadence is paused for this batch",
        //   batch.id
        // );
        continue;
      }

      let cadence = await db.PipelineCadence.findOne({
        where: {
          mainAgentId: mainAgent.id,
          pipelineId: pipeline.id,
          stage: lead.stage,
        },
      });
      if (!cadence) {
        // WriteToFile(
        //   `CronRunCadenceCallsSubsequentStages: Cadence have no active leads ${leadCad.mainAgentId} | ${lead.stage} | ${leadCad.pipelineId}`
        // );
        // return;
      } else {
        // WriteToFile(
        //   `CronRunCadenceCallsSubsequentStages:Found Cadence ${cadence.id} for  agent ${mainAgent.id} at stage ${lead.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
        // );

        // continue;
        //Get Call Schedule for the lead Stage
        let callCadence = await db.CadenceCalls.findAll({
          where: {
            pipelineCadenceId: cadence.id,
          },
        });

        // WriteToFile(
        //   "CronRunCadenceCallsSubsequentStages: Found schedule",
        //   callCadence.length
        // );

        //decide should we send call or not?
        //If initial call then check when the leadCadence was created and find the difference between lead cadence creation & Now.
        //If the distance is greater than the next call duration then make that call.

        //Checking number of calls sent to this lead
        let calls = await db.LeadCallsSent.findAll({
          where: {
            leadCadenceId: leadCad.id,
            // stage: lead.stage,
          },
          order: [["createdAt", "ASC"]],
        });
        // WriteToFile(
        //   `CronRunCadenceCallsSubsequentStages:Calls for ${leadCad.id} at stage ${lead.stage}`,
        //   calls.length
        // );

        if (calls && calls.length > 0) {
          let lastCall = calls[calls.length - 1];
          // WriteToFile(
          //   "CronRunCadenceCallsSubsequentStages: Calls sent to this lead ",
          //   calls.length
          // );
          if (lastCall.status == null || lastCall.duration == null) {
            // WriteToFile(
            //   "CronRunCadenceCallsSubsequentStages:Last call is not complete so not placing next call"
            // );
            continue;
          }
          //
          let callsStatusesToRecall = [
            "failed",
            "no-answer",
            "busy",
            "hangup_on_voicemail",
          ];

          if (lastCall.status == "completed") {
            // last call completed with status completed
            //but didn't move the lead to any stage so should call again
            if (lead.stage != lastCall.stage) {
              //last call moved the lead to new stage
              // WriteToFile(
              //   "CronRunCadenceCallsSubsequentStages:last call moved the lead to new stage",
              //   lastCall.movedToStage
              // );
            }
            if (lastCall.movedToStage == null) {
            }
            //but moved the lead to any stage so should call again
            else if (lastCall.movedToStage != null) {
            }
          } else if (!callsStatusesToRecall.includes(lastCall.status)) {
            // WriteToFile(
            //   "CronRunCadenceCallsSubsequentStages:Last call completed with status",
            //   lastCall.status
            // );
            // console.log("So recalling")
            continue;
          }

          // console.log(
          //   "Last call completed with one of these statuses",
          //   callsStatusesToRecall
          // );
          // WriteToFile("CronRunCadenceCallsSubsequentStages:So recalling");
          //Check the calls on this stage and see how many are sent on the current stage lead is at
          let callsOnThisStage = await db.LeadCallsSent.findAll({
            where: {
              leadCadenceId: leadCad.id,
              stage: lead.stage,
            },
          });
          // WriteToFile(
          //   `CronRunCadenceCallsSubsequentStages:Total Cals ",
          //   ${calls.length}`
          // );
          // WriteToFile(
          //   `CronRunCadenceCallsSubsequentStages:Calls on ${lead.stage} ${callsOnThisStage.length}`
          // );
          if (callsOnThisStage.length == callCadence.length) {
            //Don't send calls
            //All calls are sent to this lead already so we have to determine whether we push it to the next stage or do what?
            //We can either move the lead cadence to the next stage or leave it to the outcome of the call.
            //If we want the outcome to be determined based on call log first then wait for call log else
            // WriteToFile(
            //   "CronRunCadenceCallsSubsequentStages: Don't send calls. Already sent calls for this lead cadence"
            // );
            let diff = calculateDifferenceInMinutes(lastCall.createdAt); // in minutes
            // WriteToFile(`CronRunCadenceCallsSubsequentStages: Diff is ${diff}`);
            if (
              diff * 60 >= 50 &&
              lastCall.status != "" &&
              lastCall.duration != null
            ) {
              //60 * 24
              // greater than total minutes in a day = 60 * 24
              //move to next stage for now
              // WriteToFile(
              //   "CronRunCadenceCallsSubsequentStages: Moving lead to new stage | last call duration exceeded. "
              // );
              // WriteToFile(`Last Call ID ", ${lastCall.id}`);
              if (cadence.moveToStage != null) {
                lead.stage = cadence.moveToStage;
                let saved = await lead.save();
              }
              // WriteToFile(
              //   "CronRunCadenceCallsSubsequentStages: Moved one lead to new stage "
              // );
            }
            // return;
          } else {
            //Get the next call from callCadence to be sent
            // WriteToFile(
            //   "CronRunCadenceCallsSubsequentStages: Next call to be sent is ",
            //   calls.length + 1
            // );

            let nextCadenceCall = callCadence[callsOnThisStage.length];

            let waitTime =
              Number(nextCadenceCall.waitTimeDays) * 24 * 60 +
              Number(nextCadenceCall.waitTimeHours) * 60 +
              Number(nextCadenceCall.waitTimeMinutes);
            // WriteToFile(
            //   `CronRunCadenceCallsSubsequentStages: Total wait time for next call  ${waitTime} min`
            // );

            let diff = calculateDifferenceInMinutes(lastCall.createdAt); // in minutes
            // WriteToFile(`CronRunCadenceCallsSubsequentStages: Diff is ${diff}`);
            if (diff * 60 >= waitTime * 60 - 5) {
              // WriteToFile(
              //   "CronRunCadenceCallsSubsequentStages: Next call should be placed for",
              //   leadCad.id
              // );
              let agent = await db.AgentModel.findOne({
                where: {
                  mainAgentId: leadCad.mainAgentId,
                  agentType: "outbound",
                },
              });
              try {
                let tries = await db.LeadCallTriesModel.count({
                  where: {
                    leadCadenceId: leadCad.id,
                    stage: lead.stage,
                    mainAgentId: mainAgent.id,
                    status: "error",
                  },
                });
                // WriteToFile(
                //   `CronRunCadenceCallsSubsequentStages:Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
                // );

                if (tries < 3) {
                  let called = await MakeACall(
                    leadCad,
                    simulate,
                    calls,
                    batch.id
                  );
                } else {
                  //set cad errored
                  leadCad.status = CadenceStatus.Errored;
                  let saved = await leadCad?.save();

                  lead.stage = null;
                  await lead.save();
                  let called = await MakeACall(
                    leadCad,
                    simulate,
                    calls,
                    batch.id,
                    true
                  ); //maxTriesReached = true
                }
                // let called = await MakeACall(leadCad, simulate, calls, batch.id);
                //if you want to simulate
                //let called = await MakeACall(leadCad, true, calls);
              } catch (error) {
                // WriteToFile(
                //   `CronRunCadenceCallsSubsequentStages:Error Sending Call ",
                //   ${error}`
                // );
              }
              // let sent = await db.LeadCallsSent.create({
              //   leadId: leadCad.leadId,
              //   leadCadenceId: leadCad.id,
              //   mainAgentId: leadCad.mainAgentId,
              //   callTriggerTime: new Date(),
              //   agentId: agent?.id,
              //   synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCad.id}-${leadCad.stage}`,
              //   stage: leadCad.stage,
              //   status: "",
              // });
              //+ 1 because one new call is sent just now
              if (calls.length + 1 == callCadence.length) {
                // we will not move the lead to new stage after we setup webhook from synthflow.
                //There we will add this logic. This is just for testing now.
                // WriteToFile(
                //   "CronRunCadenceCallsSubsequentStages: Moving lead to new stage "
                // );
                if (cadence.moveToStage != null) {
                  lead.stage = cadence.moveToStage;
                  let saved = await lead.save();
                }
                // WriteToFile(
                //   "CronRunCadenceCallsSubsequentStages: Moved one lead to new stage "
                // );
              }
            } else {
              // WriteToFile(
              //   "CronRunCadenceCallsSubsequentStages: Difference is small so next call can not be placed"
              // );
            }
          }
        } else {
          //This will never be satisfied for this cron
          // WriteToFile(
          //   "CronRunCadenceCallsSubsequentStages: Started: No call already sent"
          // );

          //send call after checking whether the first call wait time is already passed
          //calculate time with initial leadCadence creation and now.
          let agent = await db.AgentModel.findOne({
            where: {
              mainAgentId: leadCad.mainAgentId,
              agentType: "outbound",
            },
          });
          try {
            let tries = await db.LeadCallTriesModel.count({
              where: {
                leadCadenceId: leadCad.id,
                stage: lead.stage,
                mainAgentId: mainAgent.id,
                status: "error",
              },
            });
            // WriteToFile(
            //   `Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
            // );

            if (tries < 3) {
              let called = await MakeACall(leadCad, simulate, calls, batch.id);
              if (called.status) {
                // WriteToFile(
                //   "CronRunCadenceCallsSubsequentStages: CallSent now"
                // );
              }
            } else {
              //set cad errored
              leadCad.status = CadenceStatus.Errored;
              let saved = await leadCad?.save();

              lead.stage = null;
              await lead.save();
              let called = await MakeACall(
                leadCad,
                simulate,
                calls,
                batch.id,
                true
              ); //maxTriesReached = true
            }

            //if you want to simulate
            //let called = await MakeACall(leadCad, true, calls);
          } catch (error) {
            WriteToFile(
              `CronRunCadenceCallsSubsequentStages:Error Sending Call ",
              ${error}`
            );
          }

          // let sent = await db.LeadCallsSent.create({
          //   leadId: leadCad.leadId,
          //   leadCadenceId: leadCad.id,
          //   mainAgentId: leadCad.mainAgentId,
          //   agentId: agent?.id,
          //   callTriggerTime: new Date(),
          //   synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCad.id}-${leadCad.stage}`,
          //   stage: leadCad.stage,
          //   status: "",
          // });
        }
      }
      // WriteToFile(
      //   `CronRunCadenceCallsSubsequentStages:______________________ Iteration ${i} END ______________________`
      // );
    } catch (error) {
      WriteToFile(`CronRunCadenceCallsSubsequentStages: Error cron `, error);
      // await addCallTry(leadCadence, lead, assistant, calls, batchId, "success");
    }
  }
};

const isBookingWithin10Minutes = (bookingDateTime) => {
  const currentTime = new Date(); // Get current time
  const bookingTime = new Date(bookingDateTime); // Convert booking datetime to a Date object

  // Calculate the time difference in milliseconds
  const timeDifference = bookingTime - currentTime;

  // Convert time difference to minutes and check if it's 10 minutes or more
  return timeDifference <= 10 * 60 * 1000; // 10 minutes in milliseconds
};
//Check for deleted leads as well.
const getBookingsWithin49Hours = async () => {
  const currentTime = new Date();

  // Calculate the time range
  const HoursLater48 = new Date(currentTime.getTime() + 48 * 60 * 60 * 1000); // 48 hours later
  const now = new Date(currentTime.getTime()); //0 hours later

  // Fetch bookings within the range
  const bookings = await db.ScheduledBooking.findAll({
    where: {
      datetime: {
        [db.Sequelize.Op.gte]: now, // Greater than or equal to 10 minutes later
        [db.Sequelize.Op.lte]: HoursLater48, // Less than or equal to 48 hours later
      },
      cadenceCompleted: false, // calls are not sent already
    },
  });

  return bookings;
};

export const CadenceBookedCalls = async () => {
  let meetings = await getBookingsWithin49Hours();
  console.log(`Found ${meetings.length} meetings to call in the next 49 hours`);
  for (let meeting of meetings) {
    console.log("Running for meeting ", meeting.id);
    let leadId = meeting.leadId;
    let lead = null;
    if (meeting.leadId) {
      lead = await db.LeadModel.findByPk(meeting.leadId);
      if (lead.status == "deleted") {
        continue;
      }
    } else {
      continue;
    }
    let mainAgent = await db.MainAgentModel.findByPk(meeting.mainAgentId);
    if (mainAgent) {
      let user = await db.User.findByPk(mainAgent.userId);
      if (user.totalSecondsAvailable > constants.MinThresholdSeconds) {
        //check the pipeline of the agent
        let pipeline = await GetAgentPipeline(mainAgent.id);
        if (!pipeline) {
          console.log("No pipeline for main agent ", mainAgent.id);
          continue;
        }
        let bookedStage = await GetPipelineStageWithIdentifier(
          "booked",
          pipeline.id
        );
        let pipeliceCadenceForBookingStage = await db.PipelineCadence.findOne({
          where: {
            pipelineId: pipeline.id,
            stage: bookedStage.id,
          },
          order: [["createdAt", "DESC"]],
        });
        console.log("Finding for stage ", bookedStage.id);
        if (!pipeliceCadenceForBookingStage) {
          console.log(
            "No agent work in booking stage for this pipeline",
            pipeline.id
          );
          continue;
        }
        let mainAgentForBooking = await db.MainAgentModel.findByPk(
          pipeliceCadenceForBookingStage.mainAgentId
        );
        let cadenceCallsToBeSent = await db.CadenceCalls.findAll({
          where: {
            pipelineCadenceId: pipeliceCadenceForBookingStage.id,
          },
        });
        if (cadenceCallsToBeSent && cadenceCallsToBeSent.length > 0) {
          console.log(`Total calls to be sent ${cadenceCallsToBeSent.length}`);

          let callsAlreadySent = await db.LeadCallsSent.findAll({
            where: {
              leadId: lead.id,
              mainAgentId: pipeliceCadenceForBookingStage.mainAgentId,
              // stage: bookedStage.id,
              // bookingCall: true,
              meeting: meeting.id,
            },
          });
          let nextCallTobeSent = 0;
          if (callsAlreadySent && callsAlreadySent.length >= 0) {
            console.log(`Total calls already sent ${callsAlreadySent.length}`);
            if (cadenceCallsToBeSent.length == callsAlreadySent.length) {
              meeting.cadenceCompleted = true;
              await meeting.save();
              console.log(`Meeting ${meeting.id} cadence completed`);
              continue;
            }
            nextCallTobeSent = callsAlreadySent.length;
            let nextCadenceCall = cadenceCallsToBeSent[nextCallTobeSent];
            console.log("next call ", nextCadenceCall);
            let TimeToCallBeforeMeeting =
              Number(nextCadenceCall.waitTimeDays) * 24 * 60 +
              Number(nextCadenceCall.waitTimeHours) * 60 +
              Number(nextCadenceCall.waitTimeMinutes);

            let diff = Math.abs(calculateDifferenceInMinutes(meeting.datetime)); // in minutes
            WriteToFile(`Time remaining in meeting ${diff} min`);
            console.log(
              "Next Call should be sent ",
              TimeToCallBeforeMeeting + " min before meeting"
            );

            if (
              diff * 60 <= TimeToCallBeforeMeeting * 60 - 10 &&
              diff * 60 > 0
            ) {
              console.log("Send booking call");
              let leadCad = await db.LeadCadence.findOne({
                where: {
                  leadId: lead.id,
                  mainAgentId: mainAgentForBooking.id,
                  pipelineId: pipeline.id,
                  status: "Started",
                },
              });
              if (!leadCad) {
                leadCad = await db.LeadCadence.create({
                  leadId: lead.id,
                  mainAgentId: mainAgentForBooking.id,
                  pipelineId: pipeline.id,
                  status: "Started",
                  // batchId:
                });
              }
              // lead.stage = bookedStage.id;
              await CheckAndTryToPlaceCall(
                leadCad,
                lead,
                mainAgentForBooking,
                callsAlreadySent,
                null,
                meeting
              );
            }
          } // complete
        }
      } else {
        WriteToFile(
          `Can not place call for meeting ${meeting.id} because user ${user.id} has only ${user.totalSecondsAvailable}`
        );
      }
    } else {
      console.log("Agent doesn't exist");
    }
  }
};

async function CheckAndTryToPlaceCall(
  leadCad,
  lead,
  mainAgent,
  calls,
  batch = null,
  meeting
) {
  try {
    let tries = await db.LeadCallTriesModel.count({
      where: {
        leadCadenceId: leadCad.id,
        // stage: lead.stage,
        mainAgentId: mainAgent.id,
        status: "error",
      },
    });
    WriteToFile(
      `Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
    );
    if (tries < 3) {
      let called = await MakeACall(
        leadCad,
        simulate,
        calls,
        batch?.id,
        false,
        true,
        meeting // meeting for which the call will be sent
      );
      WriteToFile("Meeting Call initiated");
      if (called.status) {
      }
    } else {
      //set cad errored
      leadCad.status = CadenceStatus.Errored;
      let saved = await leadCad?.save();

      // lead.stage = null;
      // await lead.save();
    }

    //if you want to simulate
    //let called = await MakeACall(leadCad, true, calls);
  } catch (error) {
    console.log("Error Sending Call ", error);
  }
}

// CadenceBookedCalls();
