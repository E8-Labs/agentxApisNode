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
        jsonIE = await extractIEAndStoreKycs(actions, lead, callId);
        await processInfoExtractors(
          jsonIE,
          leadCadence,
          lead,
          dbCall,
          endCallReason
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

    try {
      SetOutcomeforpreviousCalls();
    } catch (error) {
      console.log("error updating outcome", error);
    }
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
    console.log("No such agent");
    return;
  }

  // console.log("Agent is ", assistant);

  let sheet = null;
  let lead = await FindLead(leadPhone, assistant.userId);
  if (assistant.agentType == "inbound" && !lead) {
    //don't create sheet if lead already exists
    sheet = await findOrCreateSheet(assistant, constants.InboudLeadSheetName);
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
  } catch (error) {
    console.log("errorr sending notification");
  }
  const jsonIE = lead
    ? await extractIEAndStoreKycs(actions, lead, callId)
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
  callId
  // assistant = null
) {
  console.log("Extractors ", extractors);
  const keys = Object.keys(extractors);
  const ie = {};

  for (const key of keys) {
    const data = extractors[key];
    const returnValue = data.return_value;
    let question = key.replace("info_extractor_", "");
    console.log("Question is ", question);
    const answer = returnValue[question];

    ie[question] = answer;
    console.log(`IE found ${question} : ${answer}`);
    if (question.startsWith("book_appointment_with")) {
      //it is a booking action
      console.log("It is a booking action");
      ie["meetingscheduled"] = true;
      //logic to add meeting to the database and attach to lead
      try {
        MatchAndAssignLeadToMeeting(data, lead, assistant);
      } catch (error) {
        console.log("error finding meeting id");
      }
    }

    if (lead) {
      if (typeof answer === "string") {
        if (question === "prospectemail") {
          const emailFound = await db.LeadEmailModel.findOne({
            where: { email: answer, leadId: lead.id },
          });

          if (!emailFound) {
            console.log("New email added");

            await db.LeadEmailModel.create({ email: answer, leadId: lead.id });
          }
        } else if (question === "prospectname") {
          if (lead.firstName == "" || lead.firstName == null) {
            lead.firstName = answer;
            await lead.save();
          }
        } else if (!question.includes(process.env.StagePrefix)) {
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
}

// async function MatchAndAssignLeadToMeeting()
async function MatchAndAssignLeadToMeeting(data, lead, assistant = null) {
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
      await AddNotification(
        user,
        null,
        NotificationTypes.MeetingBooked,
        lead,
        assistant,
        null,
        null,
        scheduledMeeting.datetime
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
          // let stageTags = await db.StageTagModel.findAll({
          //   where: {
          //     pipelineStageId: stage.id,
          //   },
          // });
          // if (stageTags && stageTags.length > 0) {
          //   for (const t of stageTags) {
          //     db.LeadTagsModel.create({
          //       leadId: lead.id,
          //       tag: t.tag,
          //     });
          //   }
          // }
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
      Object.assign(leadCadence, {
        dnd: json.dnd,
        notinterested: json.notinterested,
        wrongnumber: json.wrongnumber,
      });
      await leadCadence.save();
    } else if (
      // json.callmeback ||
      json.humancalldrop ||
      // json.Busycallback ||
      json.nodecisionmaker
    ) {
      const followUpStage = await db.PipelineStages.findOne({
        where: { identifier: "follow_up", pipelineId: pipeline?.id || null },
      });

      if (lead.stage < followUpStage.id) {
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
        await postDataToWebhook(user, leadRes, WebhookTypes.TypeStageChange);
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
          let jsonIE = await extractIEAndStoreKycs(
            actions,
            lead,
            call.synthflowCallId
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
// SetOutcomeforpreviousCalls();
