import axios from "axios";
import JWT from "jsonwebtoken";
import db from "../models/index.js";

import path from "path";
import { fileURLToPath } from "url";
// import { CreateAndAttachAction } from "../controllers/action.controller.js";
import UserProfileFullResource from "../resources/userProfileFullResource.js";
import KycResource from "../resources/kycResource.js";
import {
  AttachInfoExtractor,
  CreateAndAttachInfoExtractor,
  CreateInfoExtractor,
  GetInfoExtractorApiData,
} from "./actionController.js";
import AgentResource from "../resources/AgentResource.js";
import LeadCadence, { CadenceStatus } from "../models/pipeline/LeadsCadence.js";
import {
  InfoExtractors,
  OpenQuestionInfoExtractors,
} from "../config/defaultInfoExtractors.js";
import { AgentObjectives } from "../constants/defaultAgentObjectives.js";
import AgentPromptModel from "../models/user/agentPromptModel.js";
// import { userInfo } from "os";
import {
  CommunityUpdateObjections,
  CommunityUpdateGuardrails,
} from "../constants/defaultObjections.js";
import {
  AddOrUpdateTag,
  AddTagsFromCustoStageToLead,
  GetColumnsInSheet,
  GetFirstAndLastName,
  mergeAndRemoveDuplicates,
  postDataToWebhook,
} from "./LeadsController.js";
import dbConfig from "../config/dbConfig.js";
import { pipeline } from "stream";
import { WebhookTypes } from "../models/webhooks/WebhookModel.js";
import LeadResource from "../resources/LeadResource.js";
import { PayAsYouGoPlans } from "../models/user/payment/paymentPlans.js";
import { ReChargeUserAccount } from "./PaymentController.js";
import { AddNotification } from "./NotificationController.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import { GetTeamAdminFor } from "../utils/auth.js";
import { constants } from "../constants/constants.js";
import { generateFailedOrCallVoilationEmail } from "../emails/system/FailedOrCallVoilationEmail.js";
import { SendEmail } from "../services/MailService.js";
import ZapierLeadResource from "../resources/ZapierLeadResource.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main Webhook Function

const MinimumAvailableSecToCharge = 120;

async function SendNotificaitonFor1KOr2KCalls(assistant) {
  let agents = await db.MainAgentModel.findAll({
    where: {
      userId: assistant.userId,
    },
  });
  let ids = [];
  if (agents && agents.length > 0) {
    ids = agents.map((item) => item.id);
  }
  let callsCount = await db.LeadCallsSent.count({
    where: {
      mainAgentId: {
        [db.Sequelize.Op.in]: ids,
      },
    },
  });

  let user = await db.User.findByPk(assistant.userId);
  if (callsCount == 1000) {
    await AddNotification(user, null, NotificationTypes.ThousandCalls);
  }
  if (callsCount == 2000) {
    await AddNotification(user, null, NotificationTypes.TwoThousandCalls);
  }
}
export const WebhookSynthflow = async (req, res) => {
  try {
    console.log("Here is webhook");
    const data = req.body;
    const dataString = JSON.stringify(data);

    logWebhookData(data, dataString);

    let modelId = null;
    const {
      callId,
      // modelId,
      status,
      duration,
      transcript,
      recordingUrl,
      endCallReason,
      actions,
    } = extractCallData(data);

    let mainAgentId = req.query.mainAgentId || null;
    let type = req.query.type || null;
    let assistant = null;
    if (!mainAgentId) {
      modelId = data.call.model_id;
      assistant = await db.AgentModel.findOne({
        where: {
          modelId: modelId,
        },
      });
      if (!assistant) {
        return res.send({ status: true, message: "No such agent" });
      }
    } else {
      console.log("New webhook called");
      //get the modelId using the query params in webhook
      assistant = await db.AgentModel.findOne({
        where: {
          agentType: type,
          mainAgentId: mainAgentId,
        },
      });
      if (assistant) {
        modelId = assistant.modelId;
      }
    }

    if (assistant) {
      SendNotificaitonFor1KOr2KCalls(assistant);
    }
    let dbCall = await db.LeadCallsSent.findOne({
      where: { synthflowCallId: callId },
    });
    let jsonIE;

    if (!dbCall) {
      console.log("Call is not already in the table.");
      dbCall = await handleNewCall(
        data,
        modelId,
        callId,
        actions,
        dataString,
        duration,
        transcript,
        recordingUrl,
        endCallReason,
        assistant
      );
    } else {
      console.log("Call is in the db");

      const leadCadenceId = dbCall.leadCadenceId;
      const leadCadence = leadCadenceId
        ? await db.LeadCadence.findByPk(leadCadenceId)
        : null;
      console.log("LEadCadence ", leadCadence);

      const lead = await db.LeadModel.findByPk(dbCall.leadId);

      console.log("Lead is ", lead);
      if (lead) {
        jsonIE = await extractIEAndStoreKycs(
          actions,
          lead,
          callId,
          modelId,
          true,
          recordingUrl
        );
        await processInfoExtractors(
          jsonIE,
          leadCadence,
          lead,
          dbCall,
          endCallReason,
          dbCall
        );
      }
    }

    // let assistant = await db.AgentModel.findOne({
    //   where: {
    //     modelId: modelId,
    //   },
    // });
    if (assistant) {
      let user = await db.User.findByPk(assistant.userId);
      user.totalSecondsAvailable = user.totalSecondsAvailable - duration;
      await user.save();
      if (user.totalSecondsAvailable <= MinimumAvailableSecToCharge) {
        let charged = await ReChargeUserAccount(user);
      }
    }

    await updateCallStatus(
      dbCall,
      status,
      duration,
      transcript,
      recordingUrl,
      dataString,
      endCallReason,
      jsonIE
    );

    // try {
    //   SetOutcomeforpreviousCalls();
    // } catch (error) {
    //   console.log("error updating outcome", error);
    // }
    return res.send({ status: true, message: "Webhook received" });
  } catch (error) {
    console.error("Error in WebhookSynthflow:", error);
    return res
      .status(500)
      .send({ status: false, message: "Internal Server Error" });
  }
};

// Helper Functions

function logWebhookData(data, dataString) {
  const currentDate = new Date();
  console.log(currentDate);
  // console.log("Webhook data is", dataString);
  console.log("Model Id", data.call.model_id);
}

function extractCallData(data) {
  return {
    callId: data.call.call_id,
    modelId: data.call.model_id,
    status: data.call.status,
    duration: data.call.duration,
    transcript: data.call.transcript,
    recordingUrl: data.call.recording_url,
    endCallReason: data.call.end_call_reason,
    actions: data.executed_actions,
  };
}

async function handleNewCall(
  data,
  modelId,
  callId,
  actions,
  dataString,
  duration,
  transcript,
  recordingUrl,
  endCallReason,
  assistant = null
) {
  console.log("Adding new call");
  const leadData = data.lead;
  const leadPhone = leadData.phone_number.replace("+", "");
  // const assistant = await db.AgentModel.findOne({ where: { modelId } });

  if (!assistant) {
    console.log("No such agent", assistant);
    return;
  }

  // console.log("Agent is ", assistant);

  let sheet = null;
  let lead = await FindLead(leadPhone, assistant.userId);
  if (assistant.agentType == "inbound" && !lead) {
    //don't create sheet if lead already exists
    //check if an inbound sheet was created
    sheet = await db.LeadSheetModel.findOne({
      where: {
        userId: assistant.userId,
        type: "inbound",
      },
    });
    if (!sheet) {
      sheet = await findOrCreateSheet(assistant, constants.InboudLeadSheetName);
    }
  }
  if (!lead) {
    lead = await findOrCreateLead(
      leadPhone,
      assistant.userId,
      sheet,
      leadData,
      assistant
    );
  }
  // if (assistant.agentType == "inbound") {
  //   try {
  //     await AddOrUpdateTag("Inbound", lead);
  //   } catch (error) {}
  // }

  //Send Notification for inbound Call
  try {
    if (assistant.agentType == "inbound") {
      console.log(`Assistant ${assistant.modelId} is inbound`, callId);
      console.log("Adding lead call back");
      let user = await db.User.findByPk(assistant.userId);
      await AddNotification(
        user,
        null,
        NotificationTypes.LeadCalledBack,
        lead,
        null,
        null,
        0,
        0,
        0,
        null,
        null,
        callId
      );
    }
  } catch (error) {
    console.log("errorr sending notification", error);
  }
  try {
    const jsonIE = lead
      ? await extractIEAndStoreKycs(
          actions,
          lead,
          callId,
          modelId,
          true,
          recordingUrl
        )
      : null;

    const leadCad = await findOrCreateLeadCadence(lead, assistant, jsonIE);
    const pipeline = await db.Pipeline.findByPk(leadCad?.pipelineId);

    const dbCall = await db.LeadCallsSent.create({
      mainAgentId: assistant.mainAgentId,
      userId: assistant.userId,
      agentId: assistant.id,
      data: dataString,
      synthflowCallId: callId,
      duration,
      recordingUrl,
      transcript,
      hotlead: jsonIE?.hotlead,
      notinterested: jsonIE?.notinterested,
      dnd: jsonIE?.dnd,
      wrongnumber: jsonIE?.wrongnumber,
      meetingscheduled: jsonIE?.meetingscheduled,
      callmeback: jsonIE?.callmeback,
      humancalldrop: jsonIE?.humancalldrop,
      voicemail: jsonIE?.voicemail,
      Busycallback: jsonIE?.Busycallback,
      nodecisionmaker: jsonIE?.nodecisionmaker,
      call_review_worthy: jsonIE?.call_review_worthy,
      leadId: lead?.id || null,
      leadCadenceId: leadCad?.id || null,
      status: data.call.status,
      batchId: null,
      pipelineId: pipeline?.id || null,
      endCallReason: endCallReason,
      conversation_detected: jsonIE?.conversation_detected,
      call_violation_detected: jsonIE?.call_violation_detected,
      ai_non_responsive_detected: jsonIE?.ai_non_responsive_detected,
    });

    await handleInfoExtractorValues(
      jsonIE,
      leadCad,
      lead,
      pipeline,
      dbCall,
      endCallReason
    );

    return dbCall;
  } catch (error) {
    console.log("Error saving call", error);
    return null;
  }
}

async function findOrCreateSheet(assistant, sheetName) {
  let sheet = await db.LeadSheetModel.findOne({
    where: { sheetName, userId: assistant.userId, status: "active" },
  });
  if (!sheet) {
    sheet = await db.LeadSheetModel.create({
      userId: assistant.userId,
      sheetName,
    });
  }
  return sheet;
}

async function FindLead(leadPhone, userId) {
  let phone = leadPhone.replace("+", "");
  let sheets = await db.LeadSheetModel.findAll({
    where: {
      userId: userId,
      status: "deleted",
    },
  });
  let ids = [];
  if (sheets && sheets.length > 0) {
    ids = sheets.map((sheet) => sheet.id);
  } else {
  }
  let lead = await db.LeadModel.findOne({
    where: {
      phone: {
        [db.Sequelize.Op.like]: `%${phone}%`,
      },
      sheetId: {
        [db.Sequelize.Op.notIn]: ids,
      },
      userId: userId,
    },
  });
  if (lead) {
    return lead;
  }
  return null;
}
async function findOrCreateLead(leadPhone, userId, sheet, leadData, assistant) {
  if (!sheet) {
    //get any Sheet fromthat user
    sheet = await db.LeadSheetModel.findOne({
      where: {
        userId: userId,
        status: "active",
      },
    });
    //if user don't have any sheet: Removing this logic as of 13 Jan 2025
    // if (!sheet) {
    //   sheet = await db.LeadSheetModel.create({
    //     sheetName: "Outbound",
    //     userId: userId,
    //   });
    // }
  }
  let phone = leadPhone.replace("+", "");
  //get the deleted sheets and find the leads that are not in these sheets
  let sheets = await db.LeadSheetModel.findAll({
    where: {
      userId: userId,
      status: "deleted",
    },
  });
  let ids = [];
  if (sheets && sheets.length > 0) {
    ids = sheets.map((sheet) => sheet.id);
  } else {
  }
  let lead = await db.LeadModel.findOne({
    where: {
      phone: {
        [db.Sequelize.Op.like]: `%${phone}%`,
      },
      sheetId: {
        [db.Sequelize.Op.notIn]: ids,
      },
      userId: userId,
    },
  });
  if (!lead) {
    let firstName = leadData.name;
    let lastName = "";
    let parts = firstName.split(" ");
    if (parts.length > 0) {
      firstName = parts[0];
      if (parts.length > 1) {
        lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
      }
    }
    lead = await db.LeadModel.create({
      phone: leadPhone,
      userId,
      sheetId: sheet?.id,
      firstName: firstName,
      lastName: lastName,
      extraColumns: JSON.stringify(leadData.prompt_variables),
    });
    // await db.LeadTagsModel.create({ tag: "inbound", leadId: lead.id });
    if (assistant.agentType == "inbound") {
      await AddOrUpdateTag("Inbound", lead);
      if (sheet) {
        await db.LeadSheetTagModel.create({
          tag: "Inbound",
          sheetId: sheet?.id,
        });
      }
    }
  }
  return lead;
}

async function createPipelineCadenceForInboundModelsOnly(assistant) {
  //Now what if both outbound and inbound agents are there but they are not assigned to the pipelinecadence.
  let outbound = await db.AgentModel.findOne({
    where: {
      mainAgentId: assistant.mainAgentId,
      agentType: "outbound",
    },
  });

  if (outbound) {
    return null;
  }
  let defaultPipeline = await db.Pipeline.findOne({
    where: {
      userId: assistant.userId,
    },
    order: [["createdAt", "ASC"]],
  });
  if (!defaultPipeline) {
    return null;
  }
  let newLead = await db.PipelineStages.findOne({
    where: {
      identifier: "new_lead",
      pipelineId: defaultPipeline.id,
    },
  });
  if (!newLead) {
    return null;
  }
  let pc = await db.PipelineCadence.create({
    mainAgentId: assistant.mainAgentId,
    stage: newLead.id,
    pipelineId: defaultPipeline.id,
    status: "Active",
  });
  return pc;
}

async function findOrCreateLeadCadence(lead, assistant, jsonIE) {
  if (!lead) return null;

  let leadCad = await db.LeadCadence.findOne({
    where: { leadId: lead?.id, mainAgentId: assistant.mainAgentId },
  });

  if (!leadCad) {
    let pipelineCadence = await db.PipelineCadence.findOne({
      where: { mainAgentId: assistant.mainAgentId },
    });
    console.log(
      "Pipeline Cadence Found in findOrCreateLeadCadence",
      pipelineCadence
    );
    if (!pipelineCadence) {
      let pc = await createPipelineCadenceForInboundModelsOnly(assistant);
      if (!pc) {
        return null;
      }
      pipelineCadence = pc;
    }

    leadCad = await db.LeadCadence.create({
      status: CadenceStatus.Started,
      leadId: lead.id,
      mainAgentId: assistant?.mainAgentId,
      pipelineId: pipelineCadence?.pipelineId,
    });

    if (pipelineCadence) {
      let pipelineId = pipelineCadence.pipelineId;
      let newLeadStage = await db.PipelineStages.findOne({
        where: {
          pipelineId: pipelineId,
          identifier: "new_lead",
        },
      });
      lead.stage = newLeadStage?.id;
      await lead.save();
    }
  }

  return leadCad;
}

async function updateCallStatus(
  dbCall,
  status,
  duration,
  transcript,
  recordingUrl,
  dataString,
  endCallReason,
  jsonIE
) {
  if (dbCall) {
    dbCall.status = status;
    dbCall.duration = duration;
    dbCall.transcript = transcript;
    dbCall.recordingUrl = recordingUrl;
    dbCall.callData = dataString;
    dbCall.endCallReason = endCallReason;
    dbCall.hotlead = jsonIE?.hotlead;
    dbCall.notinterested = jsonIE?.notinterested;
    dbCall.dnd = jsonIE?.dnd;
    dbCall.wrongnumber = jsonIE?.wrongnumber;
    dbCall.meetingscheduled = jsonIE?.meetingscheduled;
    dbCall.conversation_detected = jsonIE?.conversation_detected;
    dbCall.callmeback = jsonIE?.callmeback;
    dbCall.humancalldrop = jsonIE?.humancalldrop;
    dbCall.voicemail = jsonIE?.voicemail;
    dbCall.Busycallback = jsonIE?.Busycallback;
    dbCall.call_review_worthy = jsonIE?.call_review_worthy;
    dbCall.nodecisionmaker = jsonIE?.nodecisionmaker;
    dbCall.call_violation_detected = jsonIE?.call_violation_detected;
    dbCall.ai_non_responsive_detected = jsonIE?.ai_non_responsive_detected;
    await dbCall.save();
  }
}

async function processInfoExtractors(
  jsonIE,
  leadCadence,
  lead,
  dbCall,
  endCallReason
) {
  const pipeline = await db.Pipeline.findByPk(leadCadence?.pipelineId);
  if (jsonIE) {
    await handleInfoExtractorValues(
      jsonIE,
      leadCadence,
      lead,
      pipeline,
      dbCall,
      endCallReason
    );
  }
}

async function extractIEAndStoreKycs(
  extractors,
  lead,
  callId,
  modelId,
  shouldSendEmail = true,
  recordingUrl,
  assistant = null
) {
  try {
    let user = await db.User.findByPk(lead.userId);
    let subAgent = await db.AgentModel.findOne({
      where: {
        modelId: modelId,
      },
    });
    let mainAgent = null;
    let call = await db.LeadCallsSent.findOne({
      where: {
        synthflowCallId: callId,
      },
    });
    if (call) {
      mainAgent = await db.MainAgentModel.findByPk(call.mainAgentId);
    }
    if (!user) {
      user = await db.User.findByPk(mainAgent.userId);
    }
    console.log("Extractors ", extractors);
    const keys = Object.keys(extractors);
    const ie = {};

    for (const key of keys) {
      const data = extractors[key];
      const returnValue = data.return_value;
      let question = key.replace("info_extractor_", "").trim();
      console.log("Question is :", question);

      // console.log("Return val :", Object.keys(returnValue)[0]);
      let questionWithoutSpacesAndQuotes = question.replace(/^"(.*)"$/, "$1");
      const answer = returnValue[questionWithoutSpacesAndQuotes];
      console.log("Return val :", questionWithoutSpacesAndQuotes);
      ie[question] = answer;
      console.log(`IE found ${question} : ${answer}`);
      if (question.startsWith("book_appointment_with")) {
        //it is a booking action
        console.log("It is a booking action");
        ie["meetingscheduled"] = true;
        //logic to add meeting to the database and attach to lead
        try {
          MatchAndAssignLeadToMeeting(data, lead, assistant, recordingUrl);
        } catch (error) {
          console.log("error finding meeting id", error);
        }
      }
      if (shouldSendEmail) {
        if (
          (question == "call_violation_detected" && answer == true) ||
          (question == "ai_non_responsive_detected" && answer == true)
        ) {
          console.log("Found info Extractor non responsive");
          //send email
          let title =
            question == "call_violation_detected"
              ? "Voilation Notification"
              : "Non Responsive Agent Notification";

          let email = generateFailedOrCallVoilationEmail(
            {
              Sender_Name: user?.name,
              FailureReason: question,
              otherDetails: {
                Sender_Id: user?.id,
                Sender_Email: user?.email,
                Sender_Phone: user?.phone,
                call_id: callId,
                agent: subAgent?.name,
                model_id: modelId,
                agent_phone: subAgent?.phoneNumber,
                lead_phone: lead.phone,
                lead_name: lead.firstName || "",
                call_recording: recordingUrl,
              },
            },
            title
          );
          let sent = await SendEmail(
            constants.AdminNotifyEmail1,
            email.subject,
            email.html
          );
          let sent2 = await SendEmail(
            constants.AdminNotifyEmail2,
            email.subject,
            email.html
          );
        }
      }

      if (lead) {
        let defKycs = [
          "emailprovided",
          "dnd",
          "hotlead",
          "meetingscheduled",
          "callbackrequested",
          "notinterested",
          "humancalldrop",
          "voicemail",
          "livetransfer",
          "Busycallback",
          "nodecisionmaker",
          "conversation_detected",
          "call_violation_detected",
          "ai_non_responsive_detected",
        ];
        if (typeof answer === "string") {
          console.log("Answer is of type string");
          if (question === "prospectemail") {
            const emailFound = await db.LeadEmailModel.findOne({
              where: { email: answer, leadId: lead.id },
            });

            if (!emailFound) {
              console.log("New email added");

              await db.LeadEmailModel.create({
                email: answer,
                leadId: lead.id,
              });
            }
          } else if (question === "prospectname") {
            console.log("Prospect name is ", answer);
            if (
              lead.firstName == "" ||
              lead.firstName == null ||
              (lead.firstName == "Not" && lead.lastName == "Provided")
            ) {
              let name = GetFirstAndLastName(answer);
              lead.firstName = name.firstName;
              lead.lastName = name.lastName;
              await lead.save();
            }
          } else if (
            !question.includes(process.env.StagePrefix) &&
            !defKycs.includes(question)
          ) {
            console.log("Found kyc", question);
            let found = await db.InfoExtractorModel.findOne({
              where: { identifier: question },
            });
            if (found) {
              question = found.question;
            }
            await db.LeadKycsExtracted.create({
              question,
              answer,
              leadId: lead.id,
              callId,
            });
          }
        } else {
          console.log("IE is not open question");
        }
      }
    }

    console.log("IE obtained", ie);
    return ie;
  } catch (error) {
    console.log("Some error processing ExtractIEAndStore", error);
    return {};
  }
}

// async function MatchAndAssignLeadToMeeting()
async function MatchAndAssignLeadToMeeting(
  data,
  lead,
  assistant = null,
  recordingUrl = null
) {
  try {
    console.log("Trying to check and match lead with meeting scheduled");
    // Extract the meeting ID from the provided data
    const meetingId = data?.return_value?.results?.data?.data?.data?.id;
    console.log("Meeting id ", meetingId);

    if (!meetingId) {
      console.log("Meeting ID not found in the provided data.");
      return;
    }

    // Check if the meeting exists in the ScheduledBooking table
    const scheduledMeeting = await db.ScheduledBooking.findOne({
      where: { meetingId },
    });

    if (!scheduledMeeting) {
      console.log(`No scheduled meeting found with meeting ID: ${meetingId}`);
      return;
    }

    // Check if leadId is null in the scheduled meeting row
    if (lead?.id != null) {
      //(scheduledMeeting.leadId === null) {
      await scheduledMeeting.update({ leadId: lead.id });
      let user = await db.User.findByPk(lead.userId);
      console.log("Adding notification ", recordingUrl);
      await AddNotification(
        user,
        null,
        NotificationTypes.MeetingBooked,
        lead,
        assistant,
        null,
        0,
        0,
        0,
        recordingUrl,
        scheduledMeeting.date + " " + scheduledMeeting.time
      );
      console.log(
        `Updated scheduled meeting (ID: ${meetingId}) with leadId: ${lead.id}`
      );
    }
    // else {
    //   console.log(
    //     `Scheduled meeting (ID: ${meetingId}) already has a leadId: ${scheduledMeeting.leadId}. Skipping update.`
    //   );
    // }
  } catch (error) {
    console.error("Error processing and updating the meeting:", error);
  }
}

async function handleInfoExtractorValues(
  json,
  leadCadence,
  lead,
  pipeline,
  dbCall,
  endCallReason
) {
  // if (!pipeline) {
  //   //If no pipeline then we can not assign stage.
  //   console.log("No pipeline for this agent so skipping");
  //   return null;
  // }
  try {
    await SetAllTagsFromIEAndCall(
      json,
      dbCall.status,
      dbCall.endCallReason,
      lead
    );
  } catch (error) {
    console.log("Error saving outcome");
  }
  let outcome = GetOutcomeFromCall(json, dbCall.status, endCallReason);
  console.log("Outcome is this ", outcome);
  dbCall.callOutcome = outcome;
  await dbCall.save();
  console.log("Handling IE", json);
  const keys = Object.keys(json);
  const customStageIEs = keys.filter((str) =>
    str.includes(`${process.env.StagePrefix}_stage`)
  );
  let canMoveToDefaultStage = true;
  let movedToPriorityStage = false;
  let movedToCustom = false;
  var tags = [];
  let moveToStage = null;
  //priority
  console.log("Booked IE ", json.meetingscheduled);
  if (json.meetingscheduled) {
    console.log("It's a booked lead");
    tags.push("Booked");
    const bookedStage = await db.PipelineStages.findOne({
      where: { identifier: "booked", pipelineId: pipeline?.id || null },
    });

    moveToStage = bookedStage?.id || null;
    movedToPriorityStage = true;
  }

  if (!movedToPriorityStage) {
    for (const csIE of customStageIEs) {
      const value = json[csIE];

      if (value) {
        const stageIdentifier = csIE.replace(
          `${process.env.StagePrefix}_stage_`,
          ""
        );
        const stage = await db.PipelineStages.findOne({
          where: {
            identifier: stageIdentifier,
            pipelineId: pipeline?.id || null,
          },
        });

        if (stage) {
          canMoveToDefaultStage = false;
          dbCall.movedToStage = stage.id;
          dbCall.stage = lead.stage;
          await dbCall.save();
          lead.stage = stage.id;
          moveToStage = stage.id || null;
          await lead.save();

          //set stage tags to lead
          await AddTagsFromCustoStageToLead(lead, stage);

          movedToCustom = true;
          console.log(`Successfully moved to ${stageIdentifier}`, json[csIE]);
        }

        break;
      }
    }
    if (movedToCustom) {
      return;
    }
  }

  // if (canMoveToDefaultStage) {
  if (moveToStage == null && !movedToCustom) {
    if (json.hotlead || json.callbackrequested) {
      console.log("It's a hotlead");
      const hotLeadStage = await db.PipelineStages.findOne({
        where: { identifier: "hot_lead", pipelineId: pipeline?.id || null },
      });

      moveToStage = hotLeadStage?.id || null;
    } else if (json.notinterested || json.dnd || json.wrongnumber) {
      tags.push("Not Interested");
      const notInterestedStage = await db.PipelineStages.findOne({
        where: {
          identifier: "not_interested",
          pipelineId: pipeline?.id || null,
        },
      });

      moveToStage = notInterestedStage?.id || null;
      // Object.assign(leadCadence, {
      //   dnd: json.dnd,
      //   notinterested: json.notinterested,
      //   wrongnumber: json.wrongnumber,
      // });
      // leadCadence?.dnd = json.dnd;
      // leadCadence?.notinterested = json.notinterested;
      // leadCadence?.wrongnumber = json.wrongnumber;
      await leadCadence?.save();
    } else if (
      // json.callmeback ||
      json.humancalldrop ||
      // json.Busycallback ||
      json.nodecisionmaker
    ) {
      const followUpStage = await db.PipelineStages.findOne({
        where: { identifier: "follow_up", pipelineId: pipeline?.id || null },
      });

      if (lead.stage < followUpStage?.id) {
        moveToStage = followUpStage?.id || null;
        leadCadence.nodecisionmaker = json.nodecisionmaker;
        await leadCadence.save();
      }
    }
  }
  if (json.hotlead) {
    let user = await db.User.findByPk(lead.userId);
    let admin = await GetTeamAdminFor(user);
    // let agent = awa
    await AddNotification(
      user,
      null,
      NotificationTypes.Hotlead,
      lead,
      null,
      null
    );
  }

  // }
  if (moveToStage && !movedToCustom) {
    console.log("if moveToStage is not null ");
    // if moveToStage is not null and the lead hasn't moved to any priority stage && can move to Default Stage
    dbCall.movedToStage = moveToStage;
    dbCall.stage = lead.stage;
    await dbCall.save();
    lead.stage = moveToStage;

    await lead.save();

    try {
      let user = await db.User.findByPk(pipeline?.userId || null);
      if (user) {
        let leadRes = await LeadResource([lead]);
        let zapLeadRes = await ZapierLeadResource([lead]);
        await postDataToWebhook(user, zapLeadRes, WebhookTypes.TypeStageChange);
      }
    } catch (error) {
      console.log("Exception ", error);
    }
  }
}

const SetAllTagsFromIEAndCall = async (
  jsonIE,
  callStatus,
  endCallReason,
  lead
) => {
  let tags = [];
  if (jsonIE.meetingscheduled) {
    tags.push("Booked");
  }
  if (jsonIE.dnd) {
    tags.push("dnd");
  }
  if (jsonIE.hotlead) {
    tags.push("Hot");
    console.log("Hot lead tag");
  }
  if (jsonIE.voicemail) {
    tags.push("Voicemail");
  }

  if (jsonIE.Busycallback || callStatus == "busy") {
    tags.push("Busy");
  }
  if (callStatus == "no-answer") {
    tags.push("No Answer");
  }
  if (callStatus == "failed") {
    tags.push("Failed");
  }
  if (endCallReason == "human_pick_up_cut_off" || jsonIE.humancalldrop) {
    // tags.push("Hangup");
  }
  console.log("Tags ", tags);

  let data = [];
  for (const t of tags) {
    // data.push({ tag: t, leadId: lead.id });
    await AddOrUpdateTag(t, lead);
  }
  // let created = await db.LeadTagsModel.bulkCreate(data);
  return tags;
};
const GetOutcomeFromCall = (jsonIE, callStatus, endCallReason) => {
  console.log("Fidning outcome for ", endCallReason);
  console.log("Call status ", callStatus);
  let status = callStatus;
  let tags = [];
  // if (callStatus == "errored"){

  // }
  if (callStatus == "completed") {
    status = "Completed";

    if (endCallReason == "human_goodbye") {
      status = "Human Goodbye";
    }
    if (endCallReason == "agent_goodbye") {
      status = "Agent Goodbye";
    }
    if (endCallReason == "voicemail") {
      status = "Voicemail";
    }
    if (endCallReason == "human_pick_up_cut_off" || jsonIE.humancalldrop) {
      status = "Hangup";
    }
    if (jsonIE.notinterested) {
      status = "Not Interested";
    }
    if (jsonIE.dnd) {
      status = "Busy";
    }
    if (jsonIE.Busycallback) {
      // tags.push("Busy");
      status = "Busy";
    }
    if (jsonIE.hotlead) {
      status = "Hot Lead";
    }
    if (jsonIE.meetingscheduled) {
      status = "Booked";
    }
  } else if (callStatus == "busy") {
    status = "Busy";
  } else if (callStatus == "failed") {
    status = "Failed";
  } else if (callStatus == "hangup_on_voicemail") {
    status = "Voicemail";
  } else if (callStatus == "no-answer") {
    status = "No answer";
  } else if (endCallReason == "undefined") {
    status = callStatus;
  }
  return status;
};

export const SetOutcomeforpreviousCalls = async () => {
  console.log("Running outcome cron");
  try {
    let calls = await db.LeadCallsSent.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { callOutcome: "" }, // Matches empty string
          { callOutcome: { [db.Sequelize.Op.is]: null } }, // Matches null values
        ],
        duration: {
          [db.Sequelize.Op.ne]: null,
        },
        callData: {
          [db.Sequelize.Op.ne]: null,
        },
      },
    });
    console.log("Calls to cal  Outcome is ", calls.length);
    if (calls && calls.length > 0) {
      for (const call of calls) {
        let callData = call.callData;
        if (callData) {
          let parsed = JSON.parse(callData);
          let actions = parsed.executed_actions;
          let lead = await db.LeadModel.findByPk(call.leadId);
          let modelId = parsed.call.model_id;
          let jsonIE = await extractIEAndStoreKycs(
            actions,
            lead,
            call.synthflowCallId,
            modelId,
            false, // should send email = false
            ""
          );

          let outcome = GetOutcomeFromCall(
            jsonIE,
            call.status,
            call.endCallReason
          );
          call.callOutcome = outcome;
          console.log("Outcome 2728", outcome);
          await call.save();
        }
      }
    }
  } catch (error) {
    console.log("error setting call status in function ", error);
  }
  // return res.send({ status: true, message: "All call status updated" });
};
