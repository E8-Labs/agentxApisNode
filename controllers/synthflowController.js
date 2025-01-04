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
import { userInfo } from "os";
import {
  CommunityUpdateObjections,
  CommunityUpdateGuardrails,
} from "../constants/defaultObjections.js";
import {
  GetColumnsInSheet,
  mergeAndRemoveDuplicates,
  postDataToWebhook,
} from "./LeadsController.js";
import dbConfig from "../config/dbConfig.js";
import { pipeline } from "stream";
import { WebhookTypes } from "../models/webhooks/WebhookModel.js";
import LeadResource from "../resources/LeadResource.js";
import { chargeUser } from "../utils/stripe.js";
import { ReChargeUserAccount } from "./PaymentController.js";
import {
  createThumbnailAndUpload,
  uploadMedia,
} from "../utils/mediaservice.js";
import { GetTeamAdminFor, GetTeamIds } from "../utils/auth.js";
import { constants } from "../constants/constants.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Generate Prompt

//user is admin user
async function getInboudPromptText(prompt, assistant, user) {
  let callScript = prompt.callScript;

  let greeting = prompt.greeting;
  let companyAgentInfo = prompt.companyAgentInfo;
  companyAgentInfo = companyAgentInfo.replace(/{agent_name}/g, assistant.name);
  companyAgentInfo = companyAgentInfo.replace(
    /{agent_role}/g,
    assistant.agentRole
  );
  companyAgentInfo = companyAgentInfo.replace(
    /{brokerage_name}/g,
    user.brokerage
  );
  companyAgentInfo = companyAgentInfo.replace(/{CU_status}/g, assistant.status);
  companyAgentInfo = companyAgentInfo.replace(
    /{CU_address}/g,
    assistant.address
  );
  companyAgentInfo = companyAgentInfo.replace(
    /{call_back_number}/g,
    assistant.callbackNumber
  );
  if (assistant.liveTransfer) {
    //live_transfer_number
    companyAgentInfo = companyAgentInfo.replace(
      /{live_transfer_number}/g,
      assistant.liveTransferNumber
    );
  } else {
  }

  greeting = greeting.replace(/{agent_name}/g, assistant.name);
  greeting = greeting.replace(/{brokerage_name}/g, user.brokerage);

  callScript = callScript.replace(/{agent_name}/g, assistant.name);
  callScript = callScript.replace(/{brokerage_name}/g, user.brokerage);

  callScript = callScript.replace(/{CU_status}/g, assistant.status);
  callScript = callScript.replace(/{CU_address}/g, assistant.address);

  let guardrails = await db.ObjectionAndGuradrails.findAll({
    where: {
      mainAgentId: assistant.mainAgentId,
    },
  });

  let guardText = "";
  let objectionText = "";
  for (const guardrail in guardrails) {
    if (guardrail.type == "guardrail") {
      guardText = `${guardText}\n${guardrail.title}\n${guardrail.description}\n\n`;
    } else {
      objectionText = `${objectionText}\n${guardrail.title}\n${guardrail.description}\n\n`;
    }
  }

  let guardrailPromptText = prompt.guardRails;
  guardrailPromptText = guardrailPromptText.replace(/{guardrails}/g, guardText);

  let objectionPromptText = prompt.objectionHandling;
  objectionPromptText = objectionPromptText.replace(
    /{objections}/g,
    objectionText
  );

  if (!assistant.liveTransfer) {
    let t = `Title: Don’t Transfer Calls
Description: 
Politely decline transfer requests and reassure the caller.
Example:
“I can’t transfer you right now, but I’d be happy to schedule a callback with our team. What’s a good time to call you back?”
Book or Schedule:
Always provide clear options for callback times and book the caller on the calendar
Stay Consistent:
Stick to this rule to maintain control and professionalism in call handling.
`;
    guardrailPromptText = `${guardrailPromptText}\n\n${t}`;
  }
  //console.log("New Objection Text is ", objectionPromptText);

  //udpate the call script here
  let text = "";

  text = `${text}\n\n${prompt.objective}\n\n`;
  text = `${text}\n\n${companyAgentInfo}`;
  text = `${text}\n\n${prompt.personalCharacteristics}`;
  text = `${text}\n\n${prompt.communication}`;
  text = `${text}\n\n${greeting}`;
  text = `${text}\n\n${callScript}`;
  // text = `${text}\n\n${prompt.booking}`;
  //check if the user have connected calendar for this agent
  let cal = await db.CalendarIntegration.findOne({
    where: {
      mainAgentId: assistant.mainAgentId,
    },
  });
  if (cal) {
    //add booking
    console.log("Calendar is connected so adding booking instructions");
    text = `${text}\n\n${prompt.booking}\nTimezone for the calendar: ${
      cal.timeZone || "America/Los_Angeles"
    }`;
  }
  text = `${text}\n\n${objectionPromptText}`;
  text = `${text}\n\n${guardrailPromptText}`;
  text = `${text}\n\n${prompt.streetAddress}`;
  text = `${text}\n\n${prompt.getTools}`;

  return text;
}
//user is admin user
async function GetCompletePromptTextFrom(
  prompt,
  user,
  assistant,
  lead,
  test = false
) {
  // console.log("Prompt ");
  // console.log(prompt);
  let callScript = prompt.callScript;
  // console.log("User ", user);
  let greeting = prompt.greeting;
  let companyAgentInfo = prompt.companyAgentInfo;
  companyAgentInfo = companyAgentInfo.replace(/{agent_name}/g, assistant.name);
  companyAgentInfo = companyAgentInfo.replace(
    /{agent_role}/g,
    assistant.agentRole
  );
  companyAgentInfo = companyAgentInfo.replace(
    /{brokerage_name}/g,
    user.brokerage
  );
  companyAgentInfo = companyAgentInfo.replace(/{CU_status}/g, assistant.status);
  companyAgentInfo = companyAgentInfo.replace(
    /{CU_address}/g,
    assistant.address
  );
  companyAgentInfo = companyAgentInfo.replace(
    /{call_back_number}/g,
    assistant.callbackNumber
  );
  if (assistant.liveTransfer) {
    //live_transfer_number
    companyAgentInfo = companyAgentInfo.replace(
      /{live_transfer_number}/g,
      assistant.liveTransferNumber
    );
  } else {
  }

  greeting = greeting.replace(/{First Name}/g, lead.firstName);
  greeting = greeting.replace(/{Last Name}/g, lead.lastName);
  greeting = greeting.replace(/{Phone Number}/g, lead.phone);
  greeting = greeting.replace(/{Email}/g, lead.email);
  greeting = greeting.replace(/{Address}/g, lead.address);

  greeting = greeting.replace(/{agent_name}/g, assistant.name);
  greeting = greeting.replace(/{brokerage_name}/g, user.brokerage);

  callScript = callScript.replace(/{agent_name}/g, assistant.name);
  callScript = callScript.replace(/{brokerage_name}/g, user.brokerage);

  callScript = callScript.replace(/{CU_status}/g, assistant.status);
  callScript = callScript.replace(/{CU_address}/g, assistant.address);

  callScript = callScript.replace(/{first_name}/g, lead.firstName);
  callScript = callScript.replace(/{firstName}/g, lead.firstName);
  callScript = callScript.replace(/{First Name}/g, lead.firstName);
  callScript = callScript.replace(/{Last Name}/g, lead.lastName);
  callScript = callScript.replace(/{Email}/g, lead.email);
  callScript = callScript.replace(/{Address}/g, lead.address);

  // console.log("Call script before");
  // console.log(callScript);
  //Get UniqueColumns in Sheets
  let keys = [];
  if (test) {
    const regex = /\{(.*?)\}/g;
    let match;

    while ((match = regex.exec(callScript)) !== null) {
      keys.push(match[1]); // Add the variable name (without braces) to the array
    }

    //greeting
    while ((match = regex.exec(greeting)) !== null) {
      keys.push(match[1]); // Add the variable name (without braces) to the array
    }
  } else {
    let sheets = await db.LeadSheetModel.findAll({
      where: {
        userId: user.id,
      },
    });
    if (sheets && sheets.length > 0) {
      for (const sheet of sheets) {
        let sheetKeys = await GetColumnsInSheet(sheet.id);
        keys = mergeAndRemoveDuplicates(keys, sheetKeys);
      }
    }
  }

  console.log("Extra columns");
  console.log(typeof lead.extraColumns);
  console.log("Obtained keys ", keys);
  let extraColumns = JSON.parse(lead.extraColumns);
  console.log(lead.extraColumns);
  let extraColumsDic = {};
  // for (const col of extraColumns) {
  //   let key = Object.keys(col)[0];
  //   extraColumsDic[key] = col[key];
  // }
  if (!extraColumns || Object.keys(extraColumns).length === 0) {
    console.warn("extraColumns is empty. Skipping iteration.");
  } else if (Array.isArray(extraColumns)) {
    for (const col of extraColumns) {
      let key = Object.keys(col)[0];
      extraColumsDic[key] = col[key];
    }
  } else if (typeof extraColumns === "object") {
    for (const [key, value] of Object.entries(extraColumns)) {
      extraColumsDic[key] = value;
    }
  } else {
    console.error(
      "extraColumns is not iterable or in an unexpected format:",
      extraColumns
    );
  }

  extraColumns = extraColumsDic;
  console.log("Data json");
  console.log(extraColumns);
  for (const key of keys) {
    // console.log(`Replacing key ${key} `);
    if (extraColumns) {
      let value = extraColumns[key];
      // console.log(`Replacing key ${key} with ${value}`);
      if (value) {
        const regex = new RegExp(`\\{${key}\\}`, "gi"); // Create a dynamic regex to match `${key}`
        //console.log(`replacing ${key} with ${value}`);
        callScript = callScript.replace(regex, value);
        greeting = greeting.replace(regex, value);
      }
    }
  }
  // console.log("Greeting after replacing is ", greeting);
  // return;
  let guardrails = await db.ObjectionAndGuradrails.findAll({
    where: {
      mainAgentId: assistant.mainAgentId,
    },
  });

  let guardText = "";
  let objectionText = "";
  for (const guardrail in guardrails) {
    if (guardrail.type == "guardrail") {
      guardText = `${guardText}\n${guardrail.title}\n${guardrail.description}\n\n`;
    } else {
      objectionText = `${objectionText}\n${guardrail.title}\n${guardrail.description}\n\n`;
    }
  }

  let guardrailPromptText = prompt.guardRails;
  guardrailPromptText = guardrailPromptText.replace(/{guardrails}/g, guardText);

  let objectionPromptText = prompt.objectionHandling;
  objectionPromptText = objectionPromptText.replace(
    /{objections}/g,
    objectionText
  );

  if (!assistant.liveTransfer) {
    let t = `Title: Don’t Transfer Calls
Description: 
Politely decline transfer requests and reassure the caller.
Example:
“I can’t transfer you right now, but I’d be happy to schedule a callback with our team. What’s a good time to call you back?”
Book or Schedule:
Always provide clear options for callback times and book the caller on the calendar
Stay Consistent:
Stick to this rule to maintain control and professionalism in call handling.
`;
    guardrailPromptText = `${guardrailPromptText}\n\n${t}`;
  }
  //console.log("New Objection Text is ", objectionPromptText);

  //udpate the call script here
  //Test greeting
  greeting = `"${greeting}"`;
  let basePrompt = "";
  basePrompt = `${basePrompt}\n\n${greeting}`;
  basePrompt = `${basePrompt}\n\n${prompt.objective}\n\n`;
  basePrompt = `${basePrompt}\n\n${companyAgentInfo}`;
  basePrompt = `${basePrompt}\n\n${prompt.personalCharacteristics}`;
  basePrompt = `${basePrompt}\n\n${prompt.communication}`;
  basePrompt = `${basePrompt}\n\n${callScript}`;
  // text = `${text}\n\n${prompt.booking}`;
  //check if the user have connected calendar for this agent
  let cal = await db.CalendarIntegration.findOne({
    where: {
      mainAgentId: assistant.mainAgentId,
    },
  });
  if (cal) {
    //add booking
    console.log("Calendar is connected so adding booking instructions");
    basePrompt = `${basePrompt}\n\n${
      prompt.booking
    }\nTimezone for the calendar: ${cal.timeZone || "America/Los_Angeles"}`;
  }
  basePrompt = `${basePrompt}\n\n${objectionPromptText}`;
  basePrompt = `${basePrompt}\n\n${guardrailPromptText}`;
  basePrompt = `${basePrompt}\n\n${prompt.streetAddress}`;
  basePrompt = `${basePrompt}\n\n${prompt.getTools}`;

  //lead info
  let leadInfo = `
##Lead Info
Lead Phone Number: ${lead.phone}
Lead Name: ${lead.firstName} ${lead.lastName}
Lead Email: ${lead.email ? lead.email : "N/A"}
  `;

  basePrompt = `${basePrompt}\n\n${leadInfo}`;

  //custom variables
  let customVariables = { First_Name: lead.firstName };
  // console.log("Script", text);
  return {
    callScript: basePrompt,
    greeting: greeting,
    customVariables: customVariables,
  };
}

export async function addCallTry(
  leadCadence,
  lead,
  assistant,
  calls = [],
  batchId = null,
  status = "success",
  callId = null
) {
  try {
    console.log("Line 390", {
      leadCadence,
      lead,
      assistant,
      calls,
      batchId,
      status,
      callId,
    });
    let callTry = await db.LeadCallTriesModel.create({
      leadId: leadCadence?.leadId,
      leadCadenceId: leadCadence?.id,
      mainAgentId: leadCadence?.mainAgentId,
      agentId: assistant?.id,
      callId:
        callId == null
          ? `CallNo-${calls.length}-LeadCadId-${leadCadence?.id || "LC"}-${
              lead?.stage || ""
            }`
          : callId,
      stage: lead.stage,
      status: status,
      batchId: batchId,
    });
    console.log("Line 406", callTry);
    return callTry;
  } catch (error) {
    console.log("Error adding call try ", error);
    return null;
  }
}

//user is admin user
export async function CanMakeCalls(user) {
  let canMake = true;

  let plan = await db.PlanHistory.findOne({
    where: {
      userId: user.id,
      status: "active",
    },
    order: [["createdAt", "DESC"]],
  });
  if (!plan) {
    return { status: false, message: "User is not subscribed to any plan" };
  }
  if (user.totalSecondsAvailable <= 120) {
    let charge = await ReChargeUserAccount(user);
    return { status: false, message: "User have no balance" };
  }

  return { status: true, message: "User cab be charged" };
}

export const MakeACall = async (
  leadCadence,
  simulate = false,
  calls = [],
  batchId = null,
  maxTriesReached = false
) => {
  // setLoading(true);
  let leadId = leadCadence.leadId,
    mainAgentId = leadCadence.mainAgentId;
  let lead = await db.LeadModel.findByPk(leadId);
  let PhoneNumber = lead.phone;
  let Name = lead.firstName;
  let LastName = lead.lastName || "";
  // let Email = req.body.email;
  // let model = req.body.model || "tate";
  // let modelId = assistant.modelId;
  let mainAgentModel = await db.MainAgentModel.findByPk(mainAgentId);

  let assistant = await db.AgentModel.findOne({
    where: {
      mainAgentId: mainAgentModel.id,
      agentType: "outbound",
    },
  });

  if (simulate) {
    let sent = null;
    sent = await db.LeadCallsSent.create({
      leadId: leadCadence.leadId,
      leadCadenceId: leadCadence.id,
      mainAgentId: leadCadence.mainAgentId,
      agentId: assistant?.id,
      callTriggerTime: new Date(),
      synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCadence.id}-${lead.stage}`,
      stage: lead.stage,
      status: "success",
      endCallReason: "no-answer", //MaxTriesReached
      duration: 50,
      batchId: batchId,
    });
    await addCallTry(leadCadence, lead, assistant, calls, batchId, "success"); //errored

    return { status: true, data: sent };
  }

  let user = await db.User.findByPk(assistant.userId);
  let canMakeCalls = await CanMakeCalls(user);
  if (canMakeCalls.status == false) {
    await addCallTry(leadCadence, lead, assistant, calls, batchId, "error"); //errored

    return { status: false, data: sent };
  }
  if (maxTriesReached) {
    // If user has tried 3 times and call errored or wasn't successfull then we add a call with status maxTries Failed
    let sent = null;
    sent = await db.LeadCallsSent.create({
      leadId: leadCadence.leadId,
      leadCadenceId: leadCadence.id,
      mainAgentId: leadCadence.mainAgentId,
      agentId: assistant?.id,
      callTriggerTime: new Date(),
      synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCadence.id}-${lead.stage}`,
      stage: lead.stage,
      status: "failed",
      duration: 50,
      batchId: batchId,
    });
    // await addCallTry(leadCadence, lead, assistant, calls, batchId, "success"); //errored

    return { status: true, data: sent };
  }

  if (!assistant) {
    //console.log("No Assistant found");
    return {
      status: false,
      message: "No such assistant",
      // data: modelId,
      reason: "no_such_assistant",
    };
  }

  // let user = await db.User.findByPk(mainAgentModel.userId);
  //console.log("Calling assistant", assistant.name);
  //console.log("Model ", assistant.modelId);
  try {
    let prompt = await db.AgentPromptModel.findOne({
      where: {
        mainAgentId: mainAgentModel.id,
        type: "outbound",
      },
    });
    if (!prompt) {
      //console.log("No prompt for this agent");
      return;
    }

    let basePrompt = await GetCompletePromptTextFrom(
      prompt,
      user,
      assistant,
      lead
    );

    // kbPrompt = kbPrompt.replace(/{username}/g, user.username);
    //find if any previous calls exist
    // //console.log("#############################################\n");
    // //console.log("Base prompt being sent ", basePrompt);
    // //console.log("#############################################\n");

    let data = {
      name: Name,
      phone: PhoneNumber,
      model: assistant.modelId, //"1722652829145x214249543190325760",
      prompt: basePrompt.callScript,
      custom_variables: [basePrompt.customVariables],
      // greeting: basePrompt.greeting,
    };
    let res = await initiateCall(
      data,
      leadCadence,
      lead,
      assistant,
      mainAgentModel,
      calls,
      batchId,
      false // test call is false as this is real call
    );
    return res;
    //initiate call here
  } catch (error) {
    console.error("Error occured is :", error);
    return { status: false, message: "call is not initiated", data: null };
  }
};

export const TestAI = async (req, res) => {
  let { agentId, phone, name, extraColumns } = req.body;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      console.log("User id ", userId);
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let admin = await GetTeamAdminFor(user);

      let agent = await db.AgentModel.findByPk(agentId);
      if (!agent) {
        return res.send({
          status: false,
          message: "No such agent",
          data: null,
        });
      }
      console.log("Testing agent ", agent.agentType);
      let mainAgentModel = await db.MainAgentModel.findByPk(agent.mainAgentId);

      let prompt = await db.AgentPromptModel.findOne({
        where: {
          mainAgentId: agent.mainAgentId,
          type: agent.agentType,
        },
      });
      if (!prompt) {
        //console.log("No prompt for this agent");
        return res.send({
          status: false,
          message: "No prompt exists for this agent",
          data: null,
        });
      }

      let newLead = false;
      let lead = await db.LeadModel.findOne({
        where: {
          phone: phone,
          userId: user.id,
        },
      });

      if (!lead) {
        newLead = true;
        console.log("Lead doesn't exist");
        // { firstName: name, phone: phone, extraColumns: extraColumns };
        lead = await db.LeadModel.create({
          phone: phone,
          firstName: name,
          extraColumns: JSON.stringify(extraColumns),
          userId: mainAgentModel.userId,
        });
        console.log("Lead created", lead.id);
      } else {
        console.log("Lead already exists ", lead.id);
      }

      let pcadence = await db.PipelineCadence.findOne({
        where: {
          mainAgentId: mainAgentModel.id,
        },
        order: [["createdAt", "DESC"]],
      });
      if (pcadence) {
        let pipelineId = pcadence.pipelineId;
        let newLeadStage = await db.PipelineStages.findOne({
          where: {
            pipelineId: pipelineId,
            identifier: "new_lead",
          },
        });
        if (newLeadStage) {
          lead.stage = newLeadStage.id;
          await lead.save();
        }
      }
      let cad = null;
      if (pcadence) {
        // only add newLead the cadence
        //Pause previous if not new lead
        if (!newLead) {
          //This is not new lead so pausing previous cadence if any
          await db.LeadCadence.update(
            {
              status: CadenceStatus.Paused,
            },
            {
              where: {
                leadId: lead.id,
              },
            }
          );
        }

        //creating new Cadence
        console.log("creating new Cadence");
        cad = await db.LeadCadence.create({
          pipelineId: pcadence.pipelineId,
          mainAgentId: mainAgentModel.id,
          leadId: lead.id,
          status: CadenceStatus.TestLead,
        });
      }

      try {
        let basePrompt = await GetCompletePromptTextFrom(
          prompt,
          admin,
          agent,
          lead,
          true // test is set to true
        );
        // let greeting = prompt.greeting;
        // greeting = greeting?.replace(/{First Name}/g, lead.firstName);
        // greeting = greeting?.replace(/{agent_name}/g, agent.name);
        // greeting = greeting?.replace(/{brokerage_name}/g, user.brokerage);
        console.log("Calling Test AI with model", agent.modelId);
        let data = {
          name: name,
          phone: phone,
          model: agent.modelId, //"1722652829145x214249543190325760",
          prompt: basePrompt.callScript,
          // greeting: basePrompt.greeting,
        };

        console.log("Payload is ");
        console.log(JSON.stringify(data));
        let response = await initiateCall(
          data,
          cad,
          lead,
          agent,
          mainAgentModel,
          [], //calls
          null, //batchId
          true // test call is true
        );

        return res.send(response);
      } catch (error) {
        console.log("some error");
        return res.send({
          status: false,
          message: "Some error",
          error: error,
        });
      }
    } else {
      console.log("Unauthorized user");
      return res.send({
        status: false,
        message: "Unauthorized user",
        data: null,
      });
    }
  });
};
function sanitizeJSONString(jsonString) {
  try {
    // Use a regex to identify strings within the JSON
    return jsonString.trim().replace(/"(.*?)"/g, (match) => {
      return match.replace(/[\n\r\t]/g, (char) => {
        switch (char) {
          case "\n":
            return "\\n";
          case "\r":
            return "\\r";
          case "\t":
            return "\\t";
          default:
            return char;
        }
      });
    });
  } catch (error) {
    console.error("Error sanitizing JSON string:", error.message);
    throw new Error("Invalid JSON format.");
  }
}

async function initiateCall(
  data,
  leadCadence,
  lead,
  assistant,
  mainAgentModel,
  calls = [],
  batchId,
  test = false
) {
  console.log("IS call test ", test);
  // console.log("Call data is ", data);
  try {
    let synthKey = process.env.SynthFlowApiKey;

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://fine-tuner.ai/api/1.1/wf/v2_voice_agent_call",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${synthKey}`,
      },
      data: data,
    };

    const response = await axios.request(config);
    let json = response.data;

    // console.log(json);
    console.log("Call data ", json);
    if (typeof json == "string") {
      // json = JSON.parse(json);
      let sanitizedJSON = sanitizeJSONString(json);
      console.log("Sanitized json String ", sanitizedJSON);
      json = JSON.parse(sanitizedJSON);
    }

    if (json.status === "ok" || json.status === "success") {
      const callId = json.response.call_id;
      //console.log("Call id ", callId);
      await addCallTry(
        leadCadence,
        lead,
        assistant,
        calls,
        batchId,
        "success",
        callId
      );
      try {
        const saved = await db.LeadCallsSent.create({
          leadCadenceId: leadCadence?.id,
          synthflowCallId: callId,
          leadId: lead.id,
          transcript: "",
          summary: "",
          status: "",
          callOutcome: "",
          agentId: assistant.id,
          stage: lead?.stage,
          mainAgentId: mainAgentModel.id,
          pipelineId: leadCadence?.pipelineId,
          batchId: batchId,
          testCall: test,
        });

        //console.log("Saved ", saved);
        return { status: true, message: "call is initiated", data: saved };
      } catch (error) {
        //console.log("Error Call ", error);
        await addCallTry(leadCadence, lead, assistant, calls, batchId, "error");
        return {
          status: false,
          message: "call is not initiated due to database error",
          data: error,
        };
      }
    } else {
      console.log("Adding call try error ");
      await addCallTry(leadCadence, lead, assistant, calls, batchId, "error");
      console.log("Call Failed with line 834", json);
      if (json.status == "error") {
        if (leadCadence) {
          // leadCadence.status = CadenceStatus.Errored;
          // let saved = await leadCadence?.save();
        }
      }
      // const callId =
      //   json?.response?.call_id ||
      //   `CallNo-${calls.length}-LeadCadId-${leadCadence.id}-${lead.stage}`;
      //console.log("In else: call not initiated");
      // Add failed call in the database if required
      // const saved = await db.LeadCallsSent.create({
      //   leadCadenceId: leadCadence?.id,
      //   synthflowCallId: callId,
      //   leadId: lead.id,
      //   transcript: "",
      //   summary: "",
      //   status: "failed",
      //   agentId: assistant.id,
      //   stage: lead?.stage,
      //   mainAgentId: mainAgentModel.id,
      //   batchId: batchId,
      // });
      return { status: false, message: "call is not initiated", data: null };
    }
  } catch (error) {
    await addCallTry(leadCadence, lead, assistant, calls, batchId, "error");
    console.log("Error during Sending Call API call: ", error);
    // const callId = `CallNo-${calls.length}-LeadCadId-${leadCadence.id}-${lead.stage}`;
    //console.log("In else: call not initiated");
    // Add failed call in the database if required
    // const saved = await db.LeadCallsSent.create({
    //   leadCadenceId: leadCadence?.id,
    //   synthflowCallId: callId,
    //   leadId: lead.id,
    //   transcript: "",
    //   summary: "",
    //   status: "failed",
    //   agentId: assistant.id,
    //   stage: lead?.stage,
    //   mainAgentId: mainAgentModel.id,
    //   batchId: batchId,
    // });
    return {
      status: false,
      message: "call is not initiated due to API error",
      data: null,
    };
  }
}

export async function GetVoices(req, res) {
  try {
    let synthKey = process.env.SynthFlowApiKey;
    //console.log("Synth key is ", synthKey);

    const options = {
      method: "POST",
      url: "https://fine-tuner.ai/api/1.1/wf/v2_voice_agent_voices",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: `Bearer ${synthKey}`,
      },
      data: { workspace: "1711297163700x954223200313016300" },
    };

    axios
      .request(options)
      .then((resp) => {
        let voicesData = resp.data;

        // Check if voicesData.data is a string and needs parsing

        res.send({
          data: voicesData,
          status: true,
          message: "List",
        });
      })
      .catch((err) => console.error(err));
  } catch (error) {
    console.error("Error fetching voices:", error);
  }
}

//user = admin of the account
async function CreatePromptForAgent(
  user,
  mainAgent,
  name,
  CUStatus,
  CUAddress,
  buyer_kyc,
  seller_kyc,
  type = "outbound",
  selectedObjective
) {
  let p = selectedObjective.prompt;
  console.log("Objective ");
  console.log(selectedObjective);
  if (type == "inbound") {
    p = selectedObjective.promptInbound;
  }
  let greeting = p.greeting;
  greeting = greeting.replace(/{agent_name}/g, name);
  greeting = greeting.replace(/{brokerage_name}/g, user.brokerage);

  let callScript = p.callScript;
  callScript = callScript.replace(/{agent_name}/g, name);
  callScript = callScript.replace(/{brokerage_name}/g, user.brokerage);

  // When an agent is created, the kycs are not available. They are created at a later stage.
  // callScript = callScript.replace(/{seller_kyc}/g, seller_kyc);
  // callScript = callScript.replace(/{buyer_kyc}/g, buyer_kyc);

  callScript = callScript.replace(/{CU_status}/g, CUStatus);
  callScript = callScript.replace(/{CU_address}/g, CUAddress);

  if (p) {
    console.log("Creating prompt");
    let prompt = await db.AgentPromptModel.create({
      mainAgentId: mainAgent.id,
      objective: p.objective,
      companyAgentInfo: p.companyAgentInfo,
      personalCharacteristics: p.personalCharacteristics,
      //
      communication: p.communication,
      callScript: callScript,
      booking: p.booking,
      getTools: p.getTools,
      greeting: greeting,
      guardRails: p.guardRails,
      objectionHandling: p.objectionHandling,
      streetAddress: p.streetAddress,
      type: type,
    });
    return prompt;
  } else {
    console.log("No prompt");
    return null;
  }
}

//Updated for Team Flow
export const BuildAgent = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let admin = await GetTeamAdminFor(user);
      console.log("BuildAgent", req.body);

      const name = req.body.name;
      const agentRole = req.body.agentRole || "";
      const agentObjective = req.body.agentObjective;
      const agentObjectiveId = Number(req.body.agentObjectiveId);
      const agentType = req.body.agentType; //inbound, outbound, both
      const status = req.body.status;
      const address = req.body.address;
      const agentObjectiveDescription = req.body.agentObjectiveDescription;

      let selectedObjective = null;
      for (let i = 0; i < AgentObjectives.length; i++) {
        console.log(
          `matching ${AgentObjectives[i].id} == ${agentObjectiveId} `
        );
        if (
          AgentObjectives[i].id == agentObjectiveId ||
          AgentObjectives[i].title == agentObjective
        ) {
          selectedObjective = AgentObjectives[i];
        }
      }

      let mainAgent = await db.MainAgentModel.create({
        name: name,
        userId: user.id,
      });

      // let agentCreated = await db.AgentModel.create({
      //   mainAgentId: mainAgent.id,
      //   userId: user.id,
      // });

      //Create Default Guardrails
      for (const obj of selectedObjective.objections || []) {
        let created = await db.ObjectionAndGuradrails.create({
          title: obj.title,
          description: obj.description,
          type: "objection",
          mainAgentId: mainAgent.id,
        });
      }
      for (const obj of selectedObjective.guardrails || []) {
        let created = await db.ObjectionAndGuradrails.create({
          title: obj.title,
          description: obj.description,
          type: "guardrail",
          mainAgentId: mainAgent.id,
        });
      }
      if (!mainAgent) {
        //console.log("Error creating main agent ");
        return;
      }

      // let agents = await db.AgentModel.findAll({
      //   where: {
      //     mainAgentId: mainAgent.id,
      //   },
      // });

      try {
        let kycTextSeller = ``;
        let kycTextBuyer = ``;
        let qs = await db.KycModel.findAll({
          where: {
            mainAgentId: mainAgent.id,
            // type: "seller",
          },
        });

        for (const kyc of qs) {
          if (kyc.type == "seller") {
            kycTextSeller = `${kycTextSeller}\n${kyc.question}`;
          } else {
            kycTextBuyer = `${kycTextBuyer}\n${kyc.question}`;
          }
        }
        let CUStatus = status,
          CUAddress = address;

        //Create Prompt
        let selectedPrompt = selectedObjective.prompt;

        // //console.log("Kyc ", kycTextSeller);
        // return;
        if (agentType == "both") {
          //create Agent Sythflow

          let data = {
            userId: admin.id,
            name: name,
            agentRole: agentRole,
            agentObjective,
            agentType: "inbound",
            status,
            agentObjectiveDescription,
            address,
            mainAgentId: mainAgent.id,
            agentObjectiveId: agentObjectiveId,
            // prompt: selectedObjective.prompt,
          };
          let createdOutboundPrompt = await CreatePromptForAgent(
            admin,
            mainAgent,
            name,
            CUStatus,
            CUAddress,
            kycTextBuyer,
            kycTextSeller,
            "outbound",
            selectedObjective
          );
          let createdInboundPrompt = await CreatePromptForAgent(
            admin,
            mainAgent,
            name,
            CUStatus,
            CUAddress,
            kycTextBuyer,
            kycTextSeller,
            "inbound",
            selectedObjective
          );
          data.agentType = "inbound";

          let inboundPromptText = "";
          if (createdInboundPrompt) {
            inboundPromptText = await getInboudPromptText(
              createdInboundPrompt,
              { ...data, callbackNumber: null, liveTransferNumber: null },
              admin
            );
            data.prompt = inboundPromptText; //uncomment if we want to push the prompt to synthflow
          }
          let createdInbound = await CreateAssistantSynthflow(
            data,
            "inbound",
            mainAgent,
            user.timeZone
          );
          data.agentType = "outbound";
          if (createdOutboundPrompt) {
            //Uncomment if we want to push the prompt to synthflow
            // data.prompt = await getInboudPromptText(
            //   createdOutboundPrompt,
            //   { ...data, callbackNumber: null, liveTransferNumber: null },
            //   user
            // );

            data.prompt = null;
          }
          let createdOutbound = await CreateAssistantSynthflow(
            data,
            "outbound",
            mainAgent,
            user.timeZone
          );
        } else {
          let data = {
            userId: admin.id,
            name: name,
            agentRole: agentRole,
            agentObjective,
            agentType: agentType,
            status,
            agentObjectiveDescription,
            address,
            mainAgentId: mainAgent.id,
            agentObjectiveId: agentObjectiveId,
            // prompt: selectedObjective.prompt,
          };
          let created = await CreatePromptForAgent(
            admin,
            mainAgent,
            name,
            CUStatus,
            CUAddress,
            kycTextBuyer,
            kycTextSeller,
            agentType,
            selectedObjective
          );
          // if(createdOutbound){
          if (agentType == "inbound") {
            //only push prompt for inbound
            data.prompt = await getInboudPromptText(
              created,
              { ...data, callbackNumber: null, liveTransferNumber: null },
              admin
            );
          }
          // console.log("Prompt ");
          // console.log(data.prompt);
          // data.prompt = inboundPromptText;
          // }
          let createdAgent = await CreateAssistantSynthflow(
            data,
            agentType,
            mainAgent,
            user.timeZone
          );
        }

        let agentRes = await AgentResource(mainAgent);
        res.send({
          status: true,
          message: "Agent Created",
          data: agentRes,
        });
      } catch (error) {
        console.log(error);
        res.send({
          status: false,
          message: error.message,
          data: null,
          error: error,
        });
      }
    }
  });
};

//Updated For team flow
export const UpdateAgent = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let admin = await GetTeamAdminFor(user);

      let mainAgentId = req.body.mainAgentId;
      let agent = await db.MainAgentModel.findByPk(mainAgentId);
      if (!agent) {
        return res.send({
          status: false,
          message: "No such agent",
          data: null,
        });
      }

      console.log("User ", userId);
      console.log("Update ", req.body);
      let agents = await db.AgentModel.findAll({
        where: {
          mainAgentId: mainAgentId,
        },
      });

      if (req.body.voiceId) {
        let updated = await db.AgentModel.update(
          {
            voiceId: req.body.voiceId,
          },
          {
            where: {
              mainAgentId: mainAgentId,
            },
          }
        );

        if (agents) {
          for (let i = 0; i < agents.length; i++) {
            let a = agents[i];
            let updatedSynthflow = await UpdateAssistantSynthflow(a, {
              agent: {
                voice_id: req.body.voiceId,
              },
            });
            //console.log("Voice updated to agent on synthflow", a.modelId);
          }
        }
      }

      if (req.body.prompt || req.body.greeting) {
        let updated = await db.AgentPromptModel.update(
          {
            callScript: req.body.prompt,
            greeting: req.body.greeting,
          },
          {
            where: {
              mainAgentId: mainAgentId,
              type: "outbound",
            },
          }
        );
        if (updated) {
          //console.log("Prompt updated");
          // if (agents) {
          //   for (let i = 0; i < agents.length; i++) {
          //     let a = agents[i];
          //     if (a.agentType == "inbound") {
          //       let updatedSynthflow = await UpdateAssistantSynthflow(a, {
          //         agent: {
          //           prompt: req.body.prompt,
          //           greeting: req.body.greeting,
          //         },
          //       });
          //     }
          //     //console.log("Voice updated to agent on synthflow", a.modelId);
          //   }
          // }
        }
      }
      if (req.body.inboundPrompt || req.body.inboundGreeting) {
        let updated = await db.AgentPromptModel.update(
          {
            callScript: req.body.inboundPrompt,
            greeting: req.body.inboundGreeting,
          },
          {
            where: {
              mainAgentId: mainAgentId,
              type: "inbound",
            },
          }
        );
        if (updated) {
          //console.log("Prompt updated");
          if (agents) {
            for (let i = 0; i < agents.length; i++) {
              let a = agents[i];
              if (a.agentType == "inbound") {
                let updatedSynthflow = await UpdateAssistantSynthflow(a, {
                  agent: {
                    prompt: req.body.inboundPrompt,
                    greeting_message: req.body.inboundGreeting,
                  },
                });
              }
              //console.log("Voice updated to agent on synthflow", a.modelId);
            }
          }
        }
      }

      if (req.body.inboundObjective) {
        let updated = await db.AgentPromptModel.update(
          {
            objective: req.body.inboundObjective,
          },
          {
            where: {
              mainAgentId: mainAgentId,
              type: "inbound",
            },
          }
        );
      }
      if (req.body.outboundObjective) {
        let updated = await db.AgentPromptModel.update(
          {
            objective: req.body.outboundObjective,
          },
          {
            where: {
              mainAgentId: mainAgentId,
              type: "outbound",
            },
          }
        );
      }
      let agentRes = await AgentResource(agent);
      return res.send({
        status: true,
        message: `Agent ${agent.name} updated`,
        data: agentRes,
      });
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
        data: null,
      });
    }
  });
};

export const UploadAgentImage = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let agentId = req.body.agentId;
      let agent = await db.AgentModel.findByPk(agentId);
      if (!agent) {
        return res.send({
          status: false,
          message: "No such agent",
          data: null,
        });
      }
      let image = null; //user.full_profile_image;
      let thumbnail = null; //user.profile_image;
      //check profile image

      if (req.files && req.files.media) {
        let file = req.files.media[0];

        const mediaBuffer = file.buffer;
        const mediaType = file.mimetype;
        const mediaExt = path.extname(file.originalname);
        const mediaFilename = `${Date.now()}${mediaExt}`;
        console.log("There is a file uploaded");

        image = await uploadMedia(
          `agent_profile_${mediaFilename}`,
          mediaBuffer,
          "image/jpeg",
          "agent_images"
        );
        // https://www.blindcircle.com/agentxtest/uploads/agent_images/2024-12-30_1d32f8bc-43a9-4e5b-ab39-0ca38ad55dfc_agent_profile_1735590758961.jpg
        // console.log("Pdf uploaded is ", image);

        thumbnail = await createThumbnailAndUpload(
          mediaBuffer,
          mediaFilename,
          "agent_images"
        );

        agent.full_profile_image = image;
        agent.thumb_profile_image = thumbnail;
        await agent.save();
        return res.send({
          status: true,
          message: "Agent profile updated",
          data: agent,
        });
      } else {
        return res.send({
          status: false,
          message: "No image provided",
        });
      }
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const DeleteAgent = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let agentId = req.body.agentId;
      let agent = await db.AgentModel.findByPk(agentId);
      if (!agent) {
        return res.send({
          status: false,
          message: "No such agent",
          data: null,
        });
      }

      let agents = await db.AgentModel.findAll({
        where: {
          mainAgentId: agent.mainAgentId,
        },
      });

      // console.log("It has agents", agents);
      // for (const agent of agents) {
      //   let del = await DeleteAssistantSynthflow(agent.modelId);
      //   if (del) {
      //     console.log("Agent deleted ", agent.modelId);
      //   }
      // }

      //Cal Delete

      //if this is the last agent then delete the main agent and cadene and everything
      let calDel = await db.CalendarIntegration.destroy({
        where: {
          mainAgentId: agent.mainAgentId,
          agentId: {
            [db.Sequelize.Op.or]: [
              { [db.Sequelize.Op.eq]: null },
              { [db.Sequelize.Op.eq]: agent.id },
            ],
          },
        },
      });
      if (agents.length == 1) {
        console.log("Agents Length is 1");
        await db.ObjectionAndGuradrails.destroy({
          where: {
            mainAgentId: agent.mainAgentId,
          },
        });
        await db.AgentPromptModel.destroy({
          where: {
            mainAgentId: agent.mainAgentId,
          },
        });

        let pcDel = await db.PipelineCadence.destroy({
          where: {
            mainAgentId: agent.mainAgentId,
          },
        });
        let del = await db.MainAgentModel.destroy({
          where: {
            id: agent.mainAgentId,
          },
        });
        await agent.destroy();
      } else {
        await agent.destroy();
      }

      // let agentRes = await AgentResource(agent);
      return res.send({
        status: true,
        message: `Agent ${agent.name} deleted`,
        data: null,
      });
    } else {
      return res.send({
        status: false,
        message: "Unauthenticated user",
        data: null,
      });
    }
  });
};

//Updated For Team Flow
export const GetAgents = async (req, res) => {
  let { agentType, pipelineId } = req.query;
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let teamIds = await GetTeamIds(user);
      let admin = await GetTeamAdminFor(user);

      let agents = await db.MainAgentModel.findAll({
        where: {
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          },
        },
        order: [["createdAt", "DESC"]],
      });
      if (typeof pipelineId != "undefined" && pipelineId != null) {
        let pipeline = await db.Pipeline.findByPk(pipelineId);
        if (!pipeline) {
          return res.status(404).send({
            status: false,
            data: null,
            message: "No such pipeline",
          });
        }
        if (!teamIds.includes(pipeline.userId)) {
          //Old condition before team logic: pipeline.userId != user.id
          return res.status(403).send({
            status: false,
            data: null,
            message: "This pipeline doesn't belong to this team",
          });
        }
        let cadenceAgents = await db.PipelineCadence.findAll({
          where: {
            pipelineId: pipelineId,
          },
        });
        let cadenceAgentIds = cadenceAgents.map((item) => item.mainAgentId);
        agents = await db.MainAgentModel.findAll({
          where: {
            id: {
              [db.Sequelize.Op.in]: cadenceAgentIds,
            },
          },
          order: [["createdAt", "DESC"]],
        });
      }

      return res.send({
        status: true,
        data: await AgentResource(agents),
        message: "Agent List",
      });
    } else {
      return res.status(401).send({
        status: false,
        data: null,
        message: "Unauthorized access",
      });
    }
  });
};

//Objection & Guardrails
export const AddObjectionOrGuardrail = async (req, res) => {
  let { title, description, type, mainAgentId } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let mainAgent = await db.MainAgentModel.findOne({
        where: {
          id: mainAgentId,
        },
      });
      if (!mainAgent) {
        return res.send({
          status: false,
          message: "Agent doesn't exist",
        });
      }
      let created = await db.ObjectionAndGuradrails.create({
        title: title,
        description: description,
        type: type,
        mainAgentId: mainAgentId,
      });
      res.send({
        status: true,
        message: `${type} created`,
        data: await AgentResource(mainAgent),
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const GetObjectionsAndGuardrails = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let mainAgentId = req.query.mainAgentId;
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let objections = await db.ObjectionAndGuradrails.findAll({
        where: {
          mainAgentId: mainAgentId,
          type: "objection",
        },
      });

      let guardrails = await db.ObjectionAndGuradrails.findAll({
        where: {
          mainAgentId: mainAgentId,
          type: "guardrail",
        },
      });
      return res.send({
        status: true,
        message: "Data obtained",
        data: { objections, guardrails },
      });
    }
  });
};

export const DeleteObjectionOrGuardrail = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let id = req.body.id;
      console.log("Objection to del", id);

      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let kyc = await db.ObjectionAndGuradrails.findByPk(id);
      let mainAgentId = kyc.mainAgentId;
      if (kyc) {
        await kyc.destroy();
      }

      let agent = await db.MainAgentModel.findByPk(mainAgentId);

      let agentRes = await AgentResource(agent);

      return res.send({
        status: true,
        message: "Objection deleted",
        data: agentRes,
      });
    }
  });
};

export const GetAgentCallActivity = async (req, res) => {
  let { mainAgentId } = req.query;
  //console.log("Finding main agent calls ", mainAgentId);
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      const calls = await db.LeadCallsSent.findAll({
        include: [
          {
            model: db.LeadModel,
            as: "LeadModel", // Alias defined in the association
            // attributes: ["firstName", "lastName", "email", "phone"],
          },
          {
            model: db.PipelineStages,
            as: "PipelineStages", // Alias defined in the association
            // attributes: ["name"],
          },
          {
            model: db.LeadCadence,
            as: "LeadCadence", // Alias defined in the association
            attributes: [], // Only using LeadCadence to filter
            where: { mainAgentId: mainAgentId },
          },
        ],
        attributes: [
          "duration",
          "createdAt",
          [db.sequelize.literal("duration / 60"), "callDurationMinutes"], // Converts seconds to minutes
        ],
      });

      const formattedCalls = calls.map((call) => {
        const minutes = Math.floor(call.duration / 60);
        const seconds = call.duration % 60;
        const formattedDuration = `${String(minutes).padStart(2, "0")}:${String(
          seconds
        ).padStart(2, "0")}`;

        return {
          ...call.dataValues, // Include existing call data
          durationFormatted: formattedDuration,
        };
      });

      return res.send({
        status: true,
        data: formattedCalls,
        message: "Agent's Call List",
      });
    } else {
    }
  });
};

export const GetKyc = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let mainAgentId = req.query.mainAgentId;
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let kycs = await db.KycModel.findAll({
        where: {
          mainAgentId: mainAgentId,
        },
      });
      let qs = await KycResource(kycs);
      return res.send({
        status: true,
        message: "Kycs obtained",
        data: qs,
      });
    }
  });
};

export const AddKyc = async (req, res) => {
  let { kycQuestions, mainAgentId } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let mainAgent = await db.MainAgentModel.findByPk(mainAgentId);
      let prompts = await db.AgentPromptModel.findAll({
        where: {
          mainAgentId: mainAgentId,
        },
      });
      let kycSellerBefore = await db.KycModel.findAll({
        where: {
          mainAgentId: mainAgentId,
          type: "seller",
        },
      });

      let kycBuyerBefore = await db.KycModel.findAll({
        where: {
          mainAgentId: mainAgentId,
          type: "buyer",
        },
      });

      let kycSellerMotivationText = "";
      let kycSellerNeedsText = "";
      let kycSellerUrgencyText = "";

      let kycSellerText = "";

      let kycBuyerMotivationText = "";
      let kycBuyerNeedsText = "";
      let kycBuyerUrgencyText = "";
      let kycBuyerText = "";
      let kycs = [];
      let newSellerKycCount = 0,
        newBuyerKycCount = 0;

      if (user) {
        for (let i = 0; i < kycQuestions.length; i++) {
          let kyc = kycQuestions[i];
          kyc.actiontype = "open_question";
          kyc.description = `Based on the transcript provided, identify what the Human said when asked ${kyc.question}. If no clear answer is provided, output Not Provided.`;
          let created = await db.KycModel.create({
            userId: user.id,
            question: kyc.question,
            category: kyc.category, //Needs, Motivation, Urgency etc
            type: kyc.type, //seller or buyer
            mainAgentId: mainAgentId,
          });

          let kycExamples = [];

          if (created) {
            if (kyc.type == "seller") {
              newSellerKycCount += 1;
              kycSellerText = `${kycSellerText}\n{${kyc.question}}`;
              if (kyc.category == "need") {
                kycSellerNeedsText = `${kycSellerNeedsText}\n{${kyc.question}}`;
              }
              if (kyc.category == "motivation") {
                kycSellerMotivationText = `${kycSellerMotivationText}\n{${kyc.question}}`;
              }
              if (kyc.category == "urgency") {
                kycSellerUrgencyText = `${kycSellerUrgencyText}\n{${kyc.question}}`;
              }
              // console.log("replacing kyc ", kycSellerText);
            } else {
              newBuyerKycCount += 1;
              kycBuyerText = `${kycBuyerText}\n{${kyc.question}}`;
              if (kyc.category == "need") {
                kycBuyerNeedsText = `${kycBuyerNeedsText}\n{${kyc.question}}`;
              }
              if (kyc.category == "motivation") {
                kycBuyerMotivationText = `${kycBuyerMotivationText}\n{${kyc.question}}`;
              }
              if (kyc.category == "urgency") {
                kycBuyerUrgencyText = `${kycBuyerUrgencyText}\n{${kyc.question}}`;
              }
            }
            if (kyc.examples) {
              for (let j = 0; j < kyc.examples.length; j++) {
                let ex = kyc.examples[j];
                let createdEx = await db.KycExampleModel.create({
                  kycId: created.id,
                  example: ex,
                });
                kycExamples.push(createdEx);
              }
            }
          }

          let found = await db.InfoExtractorModel.findOne({
            where: {
              question: kyc.question,
            },
          });
          console.log("FOund ", found);
          if (found) {
            console.log("have predefined info extractor for ", kyc.question);
            console.log("IE found is ", found);
            let attached = await AttachInfoExtractor(
              mainAgentId,
              found.actionId
            );
            created.actionId = found.actionId;
          } else {
            console.log("don't have predefined info extractor", kyc.question);
            let infoExtractor = await CreateAndAttachInfoExtractor(
              mainAgentId,
              kyc
            );
            if (infoExtractor) {
              created.actionId = infoExtractor.action_id;
            }
          }
          await created.save();

          let res = await KycResource(created);
          kycs.push(res);
        }

        //replace kyc for first time
        if (prompts && prompts.length > 0) {
          if (
            kycBuyerBefore &&
            kycBuyerBefore.length == 0 &&
            newBuyerKycCount > 0
          ) {
            // console.log(
            //   "No Buyer kyc already added replacing buyer",
            //   kycBuyerText
            // );
            kycBuyerText = `Buyer Motivation:\n${kycBuyerMotivationText}\nBuyer Need:\n${kycBuyerNeedsText}\nuyer Urgency:\n${kycBuyerUrgencyText}\n`;
            for (let p of prompts) {
              let callScript = p.callScript;
              // callScript = callScript.replace(/{seller_kyc}/g, seller_kyc);
              callScript = callScript.replace(/{buyer_kyc}/g, kycBuyerText);
              p.callScript = callScript;
              await p.save();
            }
          }
          if (
            kycSellerBefore &&
            kycSellerBefore.length == 0 &&
            newSellerKycCount > 0
          ) {
            // console.log(
            //   "No seller kyc already added replacing seller",
            //   kycSellerText
            // );
            kycSellerText = `Seller Motivation:\n${kycSellerMotivationText}\nSeller Need:\n${kycSellerNeedsText}\nSeller Urgency:\n${kycSellerUrgencyText}\n`;
            for (let p of prompts) {
              let callScript = p.callScript;
              callScript = callScript.replace(/{seller_kyc}/g, kycSellerText);
              // callScript = callScript.replace(/{buyer_kyc}/g, buyer_kyc);
              p.callScript = callScript;
              await p.save();
            }
          }
        }
      }

      let agentRes = await AgentResource(mainAgent);

      return res.send({ status: true, message: "kyc added", data: agentRes });
    } else {
    }
  });
};

export const UpdateKyc = async (req, res) => {
  let { kycQuestions, mainAgentId, type } = req.body; // mainAgentId is the mainAgent id
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let mainAgent = await db.MainAgentModel.findByPk(mainAgentId);
      let prompts = await db.AgentPromptModel.findAll({
        where: {
          mainAgentId: mainAgentId,
        },
      });

      let kycs = [];

      if (user) {
        let allAgentKycs = await db.KycModel.findAll({
          where: {
            mainAgentId: mainAgentId,
            type: type,
          },
        });
        let alreadyPresentKycIds = [];
        if (allAgentKycs && allAgentKycs.length > 0) {
          alreadyPresentKycIds = allAgentKycs.map((item) => item.id);
        }

        let newKycs = [];
        for (let i = 0; i < kycQuestions.length; i++) {
          let kyc = kycQuestions[i];
          kyc.actiontype = "open_question";
          kyc.description = `Based on the transcript provided, identify what the Human said when asked ${kyc.question}. If no clear answer is provided, output Not Provided.`;

          // check if there is already a kyc with this details
          let created = await db.KycModel.findOne({
            where: {
              userId: user.id,
              question: kyc.question,
              type: kyc.type,
              category: kyc.category,
              mainAgentId: mainAgentId,
            },
          });
          //this kyc didn't exist. So add one and add IE as well
          if (!created) {
            created = await db.KycModel.create({
              userId: user.id,
              question: kyc.question,
              category: kyc.category, //Needs, Motivation, Urgency etc
              type: kyc.type, //seller or buyer
              mainAgentId: mainAgentId,
            });
            let kycExamples = [];

            if (created && kyc.examples) {
              for (let j = 0; j < kyc.examples.length; j++) {
                let ex = kyc.examples[j];
                let createdEx = await db.KycExampleModel.create({
                  kycId: created.id,
                  example: ex,
                });
                kycExamples.push(createdEx);
              }
            }

            //Add IE
            let found = await db.InfoExtractorModel.findOne({
              where: {
                question: kyc.question,
              },
            });
            console.log("FOund ", found);
            if (found) {
              console.log("have predefined info extractor for ", kyc.question);
              console.log("IE found is ", found);
              let attached = await AttachInfoExtractor(
                mainAgentId,
                found.actionId
              );
              created.actionId = found.actionId;
            } else {
              console.log("don't have predefined info extractor", kyc.question);
              let infoExtractor = await CreateAndAttachInfoExtractor(
                mainAgentId,
                kyc
              );
              if (infoExtractor) {
                created.actionId = infoExtractor.action_id;
              }
            }
            await created.save();

            let res = await KycResource(created);
            kycs.push(res);
          }
          newKycs.push(created.id);
        }

        //delete kycs that are only present in the alreadyPresentKycIds and not in the newKycs
        const kycsTobeDeleted = alreadyPresentKycIds.filter(
          (value) => !newKycs.includes(value)
        );
        console.log("Kycs older ", alreadyPresentKycIds);
        console.log("Kycs new ", newKycs);
        console.log("Kycs to delete", kycsTobeDeleted);
        for (const id of kycsTobeDeleted) {
          await DeleteKycQuesiton(id);
        }
      }

      let agentRes = await AgentResource(mainAgent);

      return res.send({ status: true, message: "kyc added", data: agentRes });
    } else {
    }
  });
};

async function DeleteKycQuesiton(kycId) {
  let kyc = await db.KycModel.findByPk(kycId);
  if (kyc && kyc.actionId) {
    //remove the action
    let agents = await db.AgentModel.findAll({
      where: {
        mainAgentId: kyc.mainAgentId,
      },
    });
    if (agents && agents.length > 0) {
      await DetachActionsSynthflow([kyc.actionId], agents[0].modelId);
      if (agents.length > 1) {
        await DetachActionsSynthflow([kyc.actionId], agents[1].modelId);
      }
    }
    //Delete action if not in the Default InfoE
    let found = await db.InfoExtractorModel.findOne({
      where: {
        question: kyc.question,
      },
    });
    // console.log("FOund ", found);
    if (!found) {
      console.log("Not a default action kyc, so delete");
      await DeleteActionSynthflow(kyc.actionId);
    } else {
      console.log("Default kyc so not deleting the action just detached");
    }
  }
  let kycsDel = await db.KycModel.destroy({
    where: {
      id: kycId,
    },
  });
}

export const DeleteKyc = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let kycId = req.body.kycId;
      console.log("Kyc to del", kycId);
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let kyc = await db.KycModel.findByPk(kycId);
      let mainAgentId = kyc.mainAgentId;

      if (kyc) {
        await DeleteKycQuesiton(kyc.id);
      }
      // if (kyc.actionId) {
      //   //remove the action
      //   let agents = await db.AgentModel.findAll({
      //     where: {
      //       mainAgentId: kyc.mainAgentId,
      //     },
      //   });
      //   if (agents && agents.length > 0) {
      //     await DetachActionsSynthflow([kyc.actionId], agents[0].modelId);
      //     if (agents.length > 1) {
      //       await DetachActionsSynthflow([kyc.actionId], agents[1].modelId);
      //     }
      //   }
      //   //Delete action if not in the Default InfoE
      //   let found = await db.InfoExtractorModel.findOne({
      //     where: {
      //       question: kyc.question,
      //     },
      //   });
      //   console.log("FOund ", found);
      //   if (!found) {
      //     console.log("Not a default action kyc, so delete");
      //     await DeleteActionSynthflow(kyc.actionId);
      //   }
      // }
      // let kycsDel = await db.KycModel.destroy({
      //   where: {
      //     id: kycId,
      //   },
      // });

      let agent = await db.MainAgentModel.findByPk(mainAgentId);

      let agentRes = await AgentResource(agent);

      return res.send({
        status: true,
        message: "Kycs deleted",
        data: agentRes,
      });
    }
  });
};

export async function CreateAssistantSynthflow(
  agentData,
  type = "outbound",
  mainAgent,
  timezone = constants.DefaultTimezone
) {
  console.log("Timezone passed ", timezone);
  let synthKey = process.env.SynthFlowApiKey;
  // console.log("Inside 1", agentData.prompt);
  const options = {
    method: "POST",
    url: "https://api.synthflow.ai/v2/assistants",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${synthKey}`,
    },
    data: {
      type: type,
      name: agentData.name,
      external_webhook_url: process.env.WebHookForSynthflow,
      timezone: timezone,
      agent: {
        prompt: agentData.prompt,
        llm: "gpt-4o",
        language: "en-US",
        greeting_message: "Hello {First_Name}",
        //   agentData.greeting ||
        //   `Hey there you have called ${mainAgent.name}. How can i assist you today?`,
        voice_id: "wefw5e68456wef",
      },
      is_recording: true,
    },
  };
  //console.log("Inside 2");
  try {
    let result = await axios.request(options);
    //console.log("Inside 3");
    //console.log("Create Assistant Api result ", result);

    if (result.status == 200) {
      let assistant = await db.AgentModel.create({
        ...agentData,
        modelId: result.data?.response?.model_id || null,
      });
      if (assistant) {
        try {
          let extractors = InfoExtractors;
          let IEIds = extractors.map((item) => {
            return item.actionId;
          });

          let created = await AttachInfoExtractor(
            mainAgent.id,
            IEIds
            // extr.actionId
          );

          // for (let i = 0; i < extractors.length; i++) {
          //   let extr = extractors[i];
          //   let created = await AttachInfoExtractor(
          //     mainAgent.id,
          //     extr.actionId
          //   );
          //   // if (created) {
          //   //   await db.InfoExtractorModel.create({
          //   //     actionId: created.action_id,
          //   //     actionType: created.action_type,
          //   //     mainAgentId: mainAgent.id,
          //   //     data: JSON.stringify(created),
          //   //   });
          //   // }
          // }
          // let createdAction = await CreateAndAttachAction(user, "kb");
        } catch (error) {
          //console.log("Error creating action kb ", error);
        }
        // try {
        //   let createdAction = await CreateAndAttachAction(user, "booking");
        // } catch (error) {
        //   //console.log("Error creating action booking ", error);
        // }
        // try {
        //   let createdAction = await CreateAndAttachAction(user, "availability");
        // } catch (error) {
        //   //console.log("Error creating action availability ", error);
        // }
      }
    }
    return result;
  } catch (error) {
    //console.log("Inside error: ", error);
    return null;
  }
}

export async function DeleteAssistantSynthflow(modelId) {
  let synthKey = process.env.SynthFlowApiKey;
  //console.log("Inside 1");
  const options = {
    method: "DELETE",
    url: `https://api.synthflow.ai/v2/assistants/${modelId}`,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${synthKey}`,
    },
  };
  //console.log("Inside 2");
  try {
    let result = await axios.request(options);
    //console.log("Inside 3");
    //console.log("Create Assistant Api result ", result);

    if (result.status == 200) {
      return true;
    }
    return false;
  } catch (error) {
    //console.log("Inside error: ", error);
    return false;
  }
}

export async function DeleteActionSynthflow(actionId) {
  let synthKey = process.env.SynthFlowApiKey;
  //console.log("Inside 1");
  const options = {
    method: "DELETE",
    url: `https://api.synthflow.ai/v2/actions/${actionId}`,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${synthKey}`,
    },
  };
  //console.log("Inside 2");
  try {
    let result = await axios.request(options);
    //console.log("Inside 3");
    console.log("Delete Action Api result ", result);

    if (result.status == 200) {
      return true;
    }
    return false;
  } catch (error) {
    console.log("Inside error: ", error);
    return false;
  }
}

export async function DetachActionsSynthflow(actionIds, modelId) {
  let synthKey = process.env.SynthFlowApiKey;
  //console.log("Inside 1");
  const options = {
    method: "POST",
    url: `https://api.synthflow.ai/v2/actions/detach`,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${synthKey}`,
    },
    data: { model_id: modelId, actions: actionIds },
  };
  //console.log("Inside 2");
  try {
    let result = await axios.request(options);
    //console.log("Inside 3");
    // console.log("Detach Action Api result ", result);

    if (result.status == 200) {
      return true;
    }
    return false;
  } catch (error) {
    //console.log("Inside error: ", error);
    return false;
  }
}

export async function UpdateAssistantSynthflow(agent, data) {
  let synthKey = process.env.SynthFlowApiKey;
  console.log("Inside Update Assistant ", data);
  const options = {
    method: "PUT",
    url: `https://api.synthflow.ai/v2/assistants/${agent.modelId}`,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${synthKey}`,
    },
    data: data,
  };
  //console.log("Inside 2");
  try {
    let result = await axios.request(options);
    //console.log("Inside 3");
    console.log("Update Assistant Api result ", result);

    if (result.status == 200) {
      //console.log("Assitant updated");
      // let assistant = await db.Assistant.create({
      //   name: name,
      //   phone: user.phone,
      //   userId: user.id,
      //   synthAssistantId: result.data?.response?.model_id || null,
      //   webook: process.env.WebHookForSynthflow,
      //   prompt: prompt,
      // });
    }
    return result;
  } catch (error) {
    //console.log("Inside error: ", error);
    return null;
  }
}

// Main Webhook Function
