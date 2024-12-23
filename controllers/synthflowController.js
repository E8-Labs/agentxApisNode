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
} from "./LeadsController.js";
import dbConfig from "../config/dbConfig.js";
import { pipeline } from "stream";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Generate Prompt

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
  console.log("User ", user);
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
  console.log();
  if (extraColumns && typeof extraColumns === "object") {
    for (const col of extraColumns) {
      let key = Object.keys(col)[0];
      extraColumsDic[key] = col[key];
    }
  } else {
    extraColumsDic = extraColumns;
  }

  extraColumns = extraColumsDic;
  console.log("Data json");
  console.log(extraColumns);
  for (const key of keys) {
    console.log(`Replacing key ${key} `);
    if (extraColumns) {
      let value = extraColumns[key];
      console.log(`Replacing key ${key} with ${value}`);
      if (value) {
        const regex = new RegExp(`\\{${key}\\}`, "gi"); // Create a dynamic regex to match `${key}`
        //console.log(`replacing ${key} with ${value}`);
        callScript = callScript.replace(regex, value);
        greeting = greeting.replace(regex, value);
      }
    }
  }
  console.log("Greeting after replacing is ", greeting);
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
  let text = "";
  text = `${text}\n\n${greeting}`;
  text = `${text}\n\n${prompt.objective}\n\n`;
  text = `${text}\n\n${companyAgentInfo}`;
  text = `${text}\n\n${prompt.personalCharacteristics}`;
  text = `${text}\n\n${prompt.communication}`;
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

  //lead info
  let leadInfo = `
##Lead Info
Lead Phone Number: ${lead.phone}
Lead Name: ${lead.firstName} ${lead.lastName}
Lead Email: ${lead.email ? lead.email : "N/A"}
  `;

  text = `${text}\n\n${leadInfo}`;
  return { callScript: text, greeting: greeting };
}

async function addCallTry(
  leadCadence,
  lead,
  assistant,
  calls = [],
  batchId = null,
  status = "success",
  callId = null
) {
  try {
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
    return callTry;
  } catch (error) {
    return null;
  }
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
      status: "failed",
      endCallReason: "Max Tries unsuccessfull",
      duration: 50,
      batchId: batchId,
    });
    await addCallTry(leadCadence, lead, assistant, calls, batchId, "success"); //errored

    return { status: true, data: sent };
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

  let user = await db.User.findByPk(mainAgentModel.userId);
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
      greeting: basePrompt.greeting,
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
          user,
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
          greeting: basePrompt.greeting,
        };
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
  console.log("Call data is ", data);
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
      await addCallTry(leadCadence, lead, assistant, calls, batchId, "error");
      console.log("Call Failed with", json);
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

export const BuildAgent = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
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
            userId: user.id,
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
            user,
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
            user,
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
              user
            );
            data.prompt = inboundPromptText; //uncomment if we want to push the prompt to synthflow
          }
          let createdInbound = await CreateAssistantSynthflow(
            data,
            "inbound",
            mainAgent
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
            mainAgent
          );
        } else {
          let data = {
            userId: user.id,
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
            user,
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
              user
            );
          }
          // console.log("Prompt ");
          // console.log(data.prompt);
          // data.prompt = inboundPromptText;
          // }
          let createdAgent = await CreateAssistantSynthflow(
            data,
            agentType,
            mainAgent
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

export const UpdateAgent = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

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

export const DeleteAgent = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let mainAgentId = req.body.mainAgentId;
      let agent = await db.MainAgentModel.findByPk(mainAgentId);
      if (!agent) {
        return res.send({
          status: false,
          message: "No such agent",
          data: null,
        });
      }

      let agents = await db.AgentModel.findAll({
        where: {
          mainAgentId: mainAgentId,
        },
      });

      console.log("It has agents", agents);
      for (const agent of agents) {
        let del = await DeleteAssistantSynthflow(agent.modelId);
        if (del) {
          console.log("Agent deleted ", agent.modelId);
        }
      }

      //Cal Delete
      let calDel = await db.CalendarIntegration.destroy({
        where: {
          mainAgentId: mainAgentId,
        },
      });

      let pcDel = await db.PipelineCadence.destroy({
        where: {
          mainAgentId: mainAgentId,
        },
      });
      let del = await db.MainAgentModel.destroy({
        where: {
          id: mainAgentId,
        },
      });

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

      let agents = await db.MainAgentModel.findAll({
        where: {
          userId: user.id,
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
        if (pipeline.userId != user.id) {
          return res.status(403).send({
            status: false,
            data: null,
            message: "This pipeline doesn't belong to this user",
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
              console.log("replacing kyc ", kycSellerText);
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
            console.log(
              "No Buyer kyc already added replacing buyer",
              kycBuyerText
            );
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
            console.log(
              "No seller kyc already added replacing seller",
              kycSellerText
            );
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
  mainAgent
) {
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

      agent: {
        prompt: agentData.prompt,
        llm: "gpt-4o",
        language: "en-US",
        greeting_message:
          agentData.greeting ||
          `Hey there you have called ${mainAgent.name}. How can i assist you today?`,
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

// Helper Functions

// Main Webhook Function
// Main Webhook Function
export const WebhookSynthflow = async (req, res) => {
  try {
    const data = req.body;
    const dataString = JSON.stringify(data);

    logWebhookData(data, dataString);

    const {
      callId,
      modelId,
      status,
      duration,
      transcript,
      recordingUrl,
      endCallReason,
      actions,
    } = extractCallData(data);

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
        endCallReason
      );
    } else {
      console.log("Call is in the db");
      const leadCadenceId = dbCall.leadCadenceId;
      const leadCadence = leadCadenceId
        ? await db.LeadCadence.findByPk(leadCadenceId)
        : null;
      const lead = leadCadence
        ? await db.LeadModel.findByPk(leadCadence.leadId)
        : null;

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
  console.log("Webhook data is", dataString);
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
  endCallReason
) {
  const leadData = data.lead;
  const leadPhone = leadData.phone_number.replace("+", "");
  const assistant = await db.AgentModel.findOne({ where: { modelId } });

  if (!assistant) {
    console.log("No such agent");
    return;
  }

  const sheet = await findOrCreateSheet(assistant, "InboundLeads");
  const lead = await findOrCreateLead(
    leadPhone,
    assistant.userId,
    sheet,
    leadData
  );
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
  let sheet = await db.LeadSheetModel.findOne({ where: { sheetName } });
  if (!sheet) {
    sheet = await db.LeadSheetModel.create({
      userId: assistant.userId,
      sheetName,
    });
  }
  return sheet;
}

async function findOrCreateLead(leadPhone, userId, sheet, leadData) {
  let lead = await db.LeadModel.findOne({
    where: { phone: leadPhone, userId: userId },
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
    await db.LeadTagsModel.create({ tag: "inbound", leadId: lead.id });
    if (sheet) {
      await db.LeadSheetTagModel.create({ tag: "inbound", sheetId: sheet?.id });
    }
  }
  return lead;
}

async function findOrCreateLeadCadence(lead, assistant, jsonIE) {
  if (!lead) return null;

  let leadCad = await db.LeadCadence.findOne({
    where: { leadId: lead?.id, mainAgentId: assistant.mainAgentId },
  });

  if (!leadCad) {
    const pipelineCadence = await db.PipelineCadence.findOne({
      where: { mainAgentId: assistant.mainAgentId },
    });

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

async function extractIEAndStoreKycs(extractors, lead, callId) {
  console.log("Extractors ", extractors);
  const keys = Object.keys(extractors);
  const ie = {};

  for (const key of keys) {
    const data = extractors[key];
    const returnValue = data.return_value;
    const question = key.replace("info_extractor_", "");
    console.log("Question is ", question);
    const answer = returnValue[question];

    ie[question] = answer;
    console.log(`IE found ${question} : ${answer}`);

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
        } else if (answer !== "prospectname") {
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

async function handleInfoExtractorValues(
  json,
  leadCadence,
  lead,
  pipeline,
  dbCall,
  endCallReason
) {
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
  var tags = [];
  let moveToStage = null;
  //priority
  console.log("Booked IE ", json.meetingscheduled);
  if (json.meetingscheduled) {
    console.log("It's a booked lead");
    tags.push("Booked");
    const bookedStage = await db.PipelineStages.findOne({
      where: { identifier: "booked", pipelineId: pipeline.id },
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
          where: { identifier: stageIdentifier, pipelineId: pipeline.id },
        });

        if (stage) {
          canMoveToDefaultStage = false;
          dbCall.movedToStage = stage.id;
          dbCall.stage = lead.stage;
          await dbCall.save();
          lead.stage = stage.id;
          await lead.save();
          console.log(`Successfully moved to ${stageIdentifier}`, json[csIE]);
        }

        break;
      }
    }
  }

  // if (canMoveToDefaultStage) {
  if (!moveToStage) {
    if (json.hotlead || json.callbackrequested) {
      console.log("It's a hotlead");
      const hotLeadStage = await db.PipelineStages.findOne({
        where: { identifier: "hot_lead", pipelineId: pipeline.id },
      });

      moveToStage = hotLeadStage?.id || null;
    } else if (json.notinterested || json.dnd || json.wrongnumber) {
      tags.push("Not Interested");
      const notInterestedStage = await db.PipelineStages.findOne({
        where: { identifier: "not_interested", pipelineId: pipeline.id },
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
        where: { identifier: "follow_up", pipelineId: pipeline.id },
      });

      if (lead.stage < followUpStage.id) {
        moveToStage = followUpStage?.id || null;
        leadCadence.nodecisionmaker = json.nodecisionmaker;
        await leadCadence.save();
      }
    }
  }

  // }
  if (moveToStage) {
    console.log("if moveToStage is not null ");
    // if moveToStage is not null and the lead hasn't moved to any priority stage && can move to Default Stage
    dbCall.movedToStage = moveToStage;
    dbCall.stage = lead.stage;
    await dbCall.save();
    lead.stage = moveToStage;
    await lead.save();
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
    tags.push("Hangup");
  }

  let data = [];
  for (const t of tags) {
    data.push({ tag: t, leadId: lead.id });
  }
  let created = await db.LeadTagsModel.bulkCreate(data);
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
    if (jsonIE.hotlead) {
      status = "Hot Lead";
    }
    if (jsonIE.meetingscheduled) {
      status = "Booked";
    }
    if (jsonIE.notinterested) {
      status = "Not Interested";
    }
    if (endCallReason == "voicemail") {
      status = "Voicemail";
    }
    if (endCallReason == "human_pick_up_cut_off" || jsonIE.humancalldrop) {
      status = "Hangup";
    }
    if (jsonIE.dnd) {
      status = "Busy";
    }
    if (jsonIE.Busycallback) {
      // tags.push("Busy");
      status = "Busy";
    }
  } else if (endCallReason == "undefined") {
    status = callStatus;
  } else if (callStatus == "busy") {
    status = "Busy";
  } else if (callStatus == "failed") {
    status = "Failed";
  } else if (callStatus == "hangup_on_voicemail") {
    status = "Voicemail";
  } else if (callStatus == "no-answer") {
    status = "No answer";
  }
  return status;
};

export const SetOutcomeforpreviousCalls = async (req, res) => {
  let calls = await db.LeadCallsSent.findAll();
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
  return res.send({ status: true, message: "All call status updated" });
};
// SetOutcomeforpreviousCalls();
