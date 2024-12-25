import db from "../models/index.js";
// import S3 from "aws-sdk/clients/s3.js";

// Twilio setup
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );
import dotenv from "dotenv";

dotenv.config();
import { CadenceStatus } from "../models/pipeline/LeadsCadence.js";

import { calculateDifferenceInMinutes } from "../utils/dateutil.js";
import { MakeACall } from "../controllers/synthflowController.js";
import { BatchStatus } from "../models/pipeline/CadenceBatchModel.js";

//Concurrent Calls- Set Limit to 100
//https://docs.synthflow.ai/docs/concurrency-calls

const simulate = process.env.CronEnvironment == "Sandbox" ? true : false;
const failedSimulation = true; // to simulate failed calls and then mark them as errored on third try
console.log("Simulate ", simulate);

export const CronRunCadenceCallsFirstBatch = async () => {
  //Find Cadences to run for leads in the initial State (New Lead)
  //Step-1 Find all leadCadences which are not completed. All leads which are pending should be pushed
  console.log("Running cron CronRunCadenceCallsFirstBatch");
  //Verify batch size limit is not reached
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0); // Set to start of the day

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999); // Set to end of the day

  let leadCadence = await db.LeadCadence.findAll({
    where: {
      status: CadenceStatus.Pending,
      callTriggerTime: { [db.Sequelize.Op.is]: null }, // Check if callTriggerTime is null
    },
    limit: 100,
  });

  console.log(`Found ${leadCadence.length} leads to start batch calls`);
  if (leadCadence.length == 0) {
    console.log(`Found No new leads to start batch calls today`);
    return;
  }

  for (let i = 0; i < leadCadence.length; i++) {
    console.log("Iteration", i);
    try {
      let leadCad = leadCadence[i];

      let batch = await db.CadenceBatchModel.findByPk(leadCad.batchId);
      if (!batch) {
        continue; // don't send cadence if not batched leadsCad calls because they were not added through assigning leads
      }
      const dbDate = new Date(batch?.startTime); // Date from the database
      const currentDate = new Date(); // Current date and time

      if (dbDate.getTime() >= currentDate.getTime()) {
        // console.log("The database date is greater than or equal to the current date.");
        console.log(
          "This cadence batch start time is in future",
          dbDate.getTime()
        );
        console.log("Current Date ", currentDate.getTime());
        continue;
      }
      console.log("Calling Batch Status ", batch?.status);
      if (batch?.status != BatchStatus.Active) {
        console.log("Cadence is paused for this batch", batch?.id);
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
      console.log(`${batch.id} Batch ${batch.batchSize} Calls: ${count}`);
      if (count >= batch?.batchSize) {
        console.log("Batch size limit reached so will push calls tomorrow");
        continue;
      } else {
      }
      console.log(`Here 1`);
      let pipeline = await db.Pipeline.findByPk(leadCad.pipelineId);
      let lead = await db.LeadModel.findByPk(leadCad.leadId);
      console.log("Finding agent for ", leadCad.mainAgentId);
      let mainAgent = await db.MainAgentModel.findByPk(leadCad.mainAgentId);
      console.log("Main Agent", mainAgent);
      let pipelineStageForLead = await db.PipelineStages.findByPk(lead.stage);
      console.log(
        `Found Lead ${lead.firstName} at stage ${pipelineStageForLead.stageTitle} in Pipeline ${pipeline.title} Assigned to ${mainAgent.name}`
      );
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
        console.log(
          `No Cadence Found for  agent ${mainAgent.id} at stage ${lead.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
        );
        continue;
      }
      console.log(
        `Found Cadence ${cadence.id} for  agent ${mainAgent.id} at stage ${leadCad.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
      );
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

        let diff = calculateDifferenceInMinutes(lastCall.createdAt); // in minutes
        console.log(`Diff is ${diff}`);
        let agent = await db.AgentModel.findOne({
          where: {
            mainAgentId: leadCad.mainAgentId,
            agentType: "outbound",
          },
        });
        if (diff * 60 >= waitTime * 60 - 10) {
          console.log("Next call should be placed as wait time is over");
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
            console.log(
              `Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
            );

            if (tries < 3) {
              let called = await MakeACall(leadCad, simulate, calls, batch.id);
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
            console.log("Error Sending Call ", error);
          }
          // let sent = await db.LeadCallsSent.create({
          //   leadId: leadCad.leadId,
          //   leadCadenceId: leadCad.id,
          //   mainAgentId: leadCad.mainAgentId,
          //   agentId: agent?.id,
          //   callTriggerTime: new Date(),
          //   synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCad.id}-${leadCad.stage}`,
          //   stage: leadCad.stage,
          // });
        } else {
          console.log("Difference is small so next call can not be placed");
        }
      } else {
        console.log("No call already sent");

        //send call after checking whether the first call wait time is already passed
        //calculate time with initial leadCadence creation and now.
        let agent = await db.AgentModel.findOne({
          where: {
            mainAgentId: leadCad.mainAgentId,
            agentType: "outbound",
          },
        });
        try {
          let called = await MakeACall(leadCad, simulate, calls, batch.id);
          console.log("First Call initiated", called);
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
                },
              }
            );
            // let saved = await leadCad.save();
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
  console.log("Running cron CronRunCadenceCallsSubsequentStages");
  //Find Cadences to run for leads in the initial State (New Lead)
  //Step-1 Find all leadCadences which are not completed. All leads which are Started should be pushed

  let leadCadence = await db.LeadCadence.findAll({
    where: {
      status: CadenceStatus.Started,
    },
    limit: 50, // Limit the batch size to 2
  });
  let newLeads = [];

  for (const l of leadCadence) {
    let mainAgentId = l.mainAgentId;
    //check if this agent isa ctive in lead's current stage
    let lead = await db.LeadModel.findByPk(l.leadId);
    let leadStage = lead.stage;
    let pCad = await db.PipelineCadence.findOne({
      where: {
        pipelineId: l.pipelineId,
        stage: leadStage,
        mainAgentId: mainAgentId,
      },
    });
    if (pCad) {
      console.log("This leadCad has active cadence rn");
      newLeads.push(l);
    }
  }

  console.log(
    `CronRunCadenceCallsSubsequentStages: Before Filter Found ${leadCadence.length} leads to start subsequent calls`
  );
  leadCadence = newLeads;
  console.log(
    `CronRunCadenceCallsSubsequentStages: After Filter Found ${leadCadence.length} leads to start subsequent calls`
  );
  // return;
  if (leadCadence.length == 0) {
    console.log(
      `CronRunCadenceCallsSubsequentStages: Found No new leads to start subsequent calls today`
    );
    return;
  } else {
    console.log("Leads found ");
    leadCadence.map((item) => {
      console.log("Lead ID ", item.leadId);
      console.log("Cad ID ", item.id);
      console.log("Batch ID ", item.batchId);
    });
  }

  for (let i = 0; i < leadCadence.length; i++) {
    console.log(
      `______________________ Iteration ${i} Start ______________________`
    );
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
    const dbDate = new Date(batch.startTime); // Date from the database
    const currentDate = new Date(); // Current date and time

    console.log(`Batch Start Time ${batch.id} `, dbDate.getTime());
    console.log("Current Time ", currentDate.getTime());
    if (dbDate.getTime() >= currentDate.getTime()) {
      // console.log("The database date is greater than or equal to the current date.");
      console.log(
        `This cadence ${batch.id} batch start time is in future`,
        dbDate.getTime()
      );
      console.log("Current Date ", currentDate.getTime());
      continue;
    }

    if (batch.status != BatchStatus.Active) {
      console.log(
        "CronRunCadenceCallsSubsequentStages: Cadence is paused for this batch",
        batch.id
      );
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
      console.log(
        `CronRunCadenceCallsSubsequentStages: Cadence have no active leads ${leadCad.mainAgentId} | ${lead.stage} | ${leadCad.pipelineId}`
      );
      // return;
    } else {
      console.log(
        `Found Cadence ${cadence.id} for  agent ${mainAgent.id} at stage ${lead.stage} in Pipeline ${pipeline.id} Assigned to ${mainAgent.name}`
      );

      // continue;
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
          // stage: lead.stage,
        },
        order: [["createdAt", "ASC"]],
      });
      console.log(
        `Calls for ${leadCad.id} at stage ${lead.stage}`,
        calls.length
      );

      if (calls && calls.length > 0) {
        let lastCall = calls[calls.length - 1];
        console.log(
          "CronRunCadenceCallsSubsequentStages: Calls sent to this lead ",
          calls.length
        );
        if (lastCall.status == null || lastCall.duration == null) {
          console.log("Last call is not complete so not placing next call");
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
            console.log(
              "last call moved the lead to new stage",
              lastCall.movedToStage
            );
          }
          if (lastCall.movedToStage == null) {
          }
          //but moved the lead to any stage so should call again
          else if (lastCall.movedToStage != null) {
          }
        } else if (!callsStatusesToRecall.includes(lastCall.status)) {
          console.log("Last call completed with status", lastCall.status);
          // console.log("So recalling")
          continue;
        }

        // console.log(
        //   "Last call completed with one of these statuses",
        //   callsStatusesToRecall
        // );
        console.log("So recalling");
        //Check the calls on this stage and see how many are sent on the current stage lead is at
        let callsOnThisStage = await db.LeadCallsSent.findAll({
          where: {
            leadCadenceId: leadCad.id,
            stage: lead.stage,
          },
        });
        console.log("Total Cals ", calls.length);
        console.log(`Calls on ${lead.stage} ${callsOnThisStage.length}`);
        if (callsOnThisStage.length == callCadence.length) {
          //Don't send calls
          //All calls are sent to this lead already so we have to determine whether we push it to the next stage or do what?
          //We can either move the lead cadence to the next stage or leave it to the outcome of the call.
          //If we want the outcome to be determined based on call log first then wait for call log else
          console.log(
            "CronRunCadenceCallsSubsequentStages: Don't send calls. Already sent calls for this lead cadence"
          );
          let diff = calculateDifferenceInMinutes(lastCall.createdAt); // in minutes
          console.log(`CronRunCadenceCallsSubsequentStages: Diff is ${diff}`);
          if (
            diff * 60 >= 50 &&
            lastCall.status != "" &&
            lastCall.duration != null
          ) {
            //60 * 24
            // greater than total minutes in a day = 60 * 24
            //move to next stage for now
            console.log(
              "CronRunCadenceCallsSubsequentStages: Moving lead to new stage | last call duration exceeded. "
            );
            console.log("Last Call ID ", lastCall.id);
            lead.stage = cadence.moveToStage;
            let saved = await lead.save();
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

          let nextCadenceCall = callCadence[callsOnThisStage.length];

          let waitTime =
            Number(nextCadenceCall.waitTimeDays) * 24 * 60 +
            Number(nextCadenceCall.waitTimeHours) * 60 +
            Number(nextCadenceCall.waitTimeMinutes);
          console.log(
            `CronRunCadenceCallsSubsequentStages: Total wait time for next call  ${waitTime} min`
          );

          let diff = calculateDifferenceInMinutes(lastCall.createdAt); // in minutes
          console.log(`CronRunCadenceCallsSubsequentStages: Diff is ${diff}`);
          if (diff * 60 >= waitTime * 60 - 5) {
            console.log(
              "CronRunCadenceCallsSubsequentStages: Next call should be placed for",
              leadCad.id
            );
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
              console.log(
                `Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
              );

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
              console.log("Error Sending Call ", error);
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
              console.log(
                "CronRunCadenceCallsSubsequentStages: Moving lead to new stage "
              );
              lead.stage = cadence.moveToStage;
              let saved = await lead.save();
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
          console.log(
            `Tries for ${lead.id} cad ${leadCad.id} STG ${lead.stage} for MA ${mainAgent.id} = ${tries}`
          );

          if (tries < 3) {
            let called = await MakeACall(leadCad, simulate, calls, batch.id);
            if (called.status) {
              console.log("CronRunCadenceCallsSubsequentStages: CallSent now");
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
          console.log("Error Sending Call ", error);
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
    console.log(
      `______________________ Iteration ${i} END ______________________`
    );
  }
};
