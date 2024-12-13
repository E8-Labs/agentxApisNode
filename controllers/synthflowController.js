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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Generate Prompt
async function GetCompletePromptTextFrom(
  prompt,
  user,
  assistant,
  lead,
  test = false
) {
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

  //Get UniqueColumns in Sheets
  let keys = [];
  if (test) {
    const regex = /\{(.*?)\}/g;
    let match;

    while ((match = regex.exec(callScript)) !== null) {
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

  console.log("Obtained keys ", keys);
  for (const key of keys) {
    if (lead.extraColumns) {
      let value = lead.extraColumns[key];
      if (value) {
        const regex = new RegExp(`\\\`${key}\\\``, "g"); // Create a dynamic regex to match `${key}`
        //console.log(`replacing ${key} with ${value}`);
        callScript = callScript.replace(regex, value);
      }
    }
  }

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
  text = `${text}\n\n${objectionPromptText}`;
  text = `${text}\n\n${guardrailPromptText}`;
  text = `${text}\n\n${prompt.streetAddress}`;
  text = `${text}\n\n${prompt.getTools}`;

  return text;
}

export const MakeACall = async (
  leadCadence,
  simulate = false,
  calls = [],
  batchId = null
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
    let sent = await db.LeadCallsSent.create({
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

    let data = JSON.stringify({
      name: Name,
      phone: PhoneNumber,
      model: assistant.modelId, //"1722652829145x214249543190325760",
      prompt: basePrompt,
    });
    let res = await initiateCall(
      data,
      leadCadence,
      lead,
      assistant,
      mainAgentModel,
      calls,
      batchId
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
      let mainAgentModel = await db.MainAgentModel.findByPk(agent.mainAgentId);
      let prompt = await db.AgentPromptModel.findOne({
        where: {
          mainAgentId: agent.mainAgentId,
          type: "outbound",
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

      let lead = { firstName: name, phone: phone, extraColumns: extraColumns };

      try {
        let basePrompt = await GetCompletePromptTextFrom(
          prompt,
          user,
          agent,
          lead,
          true // test is set to true
        );

        let data = JSON.stringify({
          name: name,
          phone: phone,
          model: agent.modelId, //"1722652829145x214249543190325760",
          prompt: basePrompt,
        });
        let response = await initiateCall(
          data,
          null,
          lead,
          agent,
          mainAgentModel
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
  batchId
) {
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

    //console.log(json);
    // console.log("Call data ", json);
    if (typeof json == "string") {
      // json = JSON.parse(json);
      let sanitizedJSON = sanitizeJSONString(json);
      console.log("Sanitized json String ", sanitizedJSON);
      json = JSON.parse(sanitizedJSON);
    }

    if (json.status === "ok" || json.status === "success") {
      const callId = json.response.call_id;
      //console.log("Call id ", callId);

      try {
        const saved = await db.LeadCallsSent.create({
          leadCadenceId: leadCadence?.id,
          synthflowCallId: callId,
          leadId: lead.id,
          transcript: "",
          summary: "",
          status: "",
          agentId: assistant.id,
          stage: leadCadence?.stage,
          mainAgentId: mainAgentModel.id,
          batchId: batchId,
        });

        //console.log("Saved ", saved);
        return { status: true, message: "call is initiated", data: saved };
      } catch (error) {
        //console.log("Error Call ", error);
        return {
          status: false,
          message: "call is not initiated due to database error",
          data: error,
        };
      }
    } else {
      console.log("Type of json:", typeof json);
      const callId =
        json?.response?.call_id ||
        `CallNo-${calls.length}-LeadCadId-${leadCadence.id}-${lead.stage}`;
      //console.log("In else: call not initiated");
      // Add failed call in the database if required
      const saved = await db.LeadCallsSent.create({
        leadCadenceId: leadCadence?.id,
        synthflowCallId: callId,
        leadId: lead.id,
        transcript: "",
        summary: "",
        status: "failed",
        agentId: assistant.id,
        stage: lead?.stage,
        mainAgentId: mainAgentModel.id,
        batchId: batchId,
      });
      return { status: false, message: "call is not initiated", data: null };
    }
  } catch (error) {
    console.log("Error during Sending Call API call: ", error);
    const callId = `CallNo-${calls.length}-LeadCadId-${leadCadence.id}-${lead.stage}`;
    //console.log("In else: call not initiated");
    // Add failed call in the database if required
    const saved = await db.LeadCallsSent.create({
      leadCadenceId: leadCadence?.id,
      synthflowCallId: callId,
      leadId: lead.id,
      transcript: "",
      summary: "",
      status: "failed",
      agentId: assistant.id,
      stage: lead?.stage,
      mainAgentId: mainAgentModel.id,
      batchId: batchId,
    });
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

  if (selectedObjective.prompt) {
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
  } else {
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

      const name = req.body.name;
      const agentRole = req.body.agentRole || "";
      const agentObjective = req.body.agentObjective;
      const agentObjectiveId = req.body.agentObjectiveId;
      const agentType = req.body.agentType; //inbound, outbound, both
      const status = req.body.status;
      const address = req.body.address;
      const agentObjectiveDescription = req.body.agentObjectiveDescription;

      let selectedObjective = null;
      for (let i = 0; i < AgentObjectives.length; i++) {
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
          let createdInbound = await CreateAssistantSynthflow(
            data,
            "inbound",
            mainAgent
          );
          data.agentType = "outbound";
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
        //console.log(error);
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

      if (req.body.prompt) {
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
        }
      }
      if (req.body.inboundPrompt) {
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
        }
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
            for (let j = 0; j < kyc.examples.length; j++) {
              let ex = kyc.examples[j];
              let createdEx = await db.KycExampleModel.create({
                kycId: created.id,
                example: ex,
              });
              kycExamples.push(createdEx);
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
          } else {
            console.log("don't have predefined info extractor", kyc.question);
            let infoExtractor = await CreateAndAttachInfoExtractor(
              mainAgentId,
              kyc
            );
          }

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

export const DeleteKyc = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let kycId = req.body.kycId;
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let kyc = await db.KycModel.findByPk(kycId);
      let mainAgentId = kyc.mainAgentId;
      let kycsDel = await db.KycModel.destroy({
        where: {
          id: kycId,
        },
      });

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
  //console.log("Inside 1");
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
        llm: "gpt-4o",
        language: "en-US",
        prompt: "",
        greeting_message: "",
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
    url: `https://api.synthflow.ai/v2/actions/action_id/${actionId}`,
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
    //console.log("Inside error: ", error);
    return false;
  }
}

export async function UpdateAssistantSynthflow(agent, data) {
  let synthKey = process.env.SynthFlowApiKey;
  //console.log("Inside Update Assistant ", data);
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
    //console.log("Create Assistant Api result ", result);

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

//Webhook
export const WebhookSynthflow = async (req, res) => {
  // //console.log("Request headers:", req.headers);
  // //console.log("Request body:", req.body);
  // //console.log("Request raw data:", req);

  let data = req.body;

  let dataString = JSON.stringify(data);
  console.log("Webhook data is ", dataString);
  let callId = data.call.call_id;
  let modelId = data.call.model_id;
  console.log("Model Id ", modelId);
  let status = data.call.status;
  let duration = data.call.duration;
  let transcript = data.call.transcript;
  let recordingUrl = data.call.recording_url;
  let actions = data.executed_actions;
  // //console.log("Actions ", actions);

  let json = extractInfo(data);
  // console.log("Extracted info ", json);
  // return;
  let dbCall = await db.LeadCallsSent.findOne({
    where: {
      synthflowCallId: callId,
    },
  });

  let extractors = data.executed_actions;
  let allKeys = Object.keys(extractors);
  let allCustomStageInfoExtractorkeys = [];
  allKeys.map((item) => {
    if (item.includes(`${process.env.StagePrefix}_stage`)) {
      allCustomStageInfoExtractorkeys.push(item);
      let data = extractors[item];
      // console.log("Data for custom stage is ", data);
    } else {
    }
  });
  // console.log("All custom infoExtractors", allCustomStageInfoExtractorkeys);
  if (!dbCall) {
    console.log("Call is not already in the table.");

    //create new call
    let leadData = data.lead;
    let leadPhone = leadData.phone_number;
    leadPhone = leadPhone.replace("+", "");
    console.log("Lead phone ", leadPhone);
    let lead = await db.LeadModel.findOne({
      where: {
        phone: leadPhone,
      },
    });
    //Find assistant
    let assistant = await db.AgentModel.findOne({
      where: {
        modelId: modelId,
      },
    });
    if (!assistant) {
      console.log("No such agent");
      return;
    }
    let userId = assistant.userId; // userId
    let sheet = null;
    if (assistant && assistant.agentType == "inbound") {
      console.log("It's an inbound model");
      sheet = await db.LeadSheetModel.findOne({
        where: {
          sheetName: "InboundLeads",
        },
      });
      if (!sheet) {
        sheet = await db.LeadSheetModel.create({
          userId: userId,
          sheetName: "InboundLeads",
        });
      }
    }
    //find sheet
    if (!lead) {
      lead = await db.LeadModel.create({
        phone: leadPhone,
        userId: userId,
        sheetId: sheet.id,
        firstName: leadData.name,
        extraColumns: JSON.stringify(leadData.prompt_variables),
      });
    }
    let jsonIE = null;
    if (lead) {
      jsonIE = await extractIEAndStoreKycs(actions, lead, callId);
    }

    // console.log("Lead ", lead);

    //get pipeline and leadCad
    let leadCad = null;

    if (lead) {
      leadCad = await db.LeadCadence.findOne({
        where: {
          leadId: lead?.id,
          mainAgentId: assistant.mainAgentId,
        },
      });
      if (!leadCad) {
        //Agent can be active only in one pipeline at atime
        let pipelineCadence = await db.PipelineCadence.findOne({
          where: {
            mainAgentId: assistant.mainAgentId,
          },
        });

        leadCad = await db.LeadCadence.create({
          // mainAgentId: assistant.mainAgentId,
          status: CadenceStatus.Started,
          leadId: lead.id,
          pipelineId: pipelineCadence?.pipelineId,
        });
      }
    }
    if (!leadCad) {
      console.log("Couldn't find any leadCadence");
      // return;
    }

    let pipeline = await db.Pipeline.findByPk(leadCad?.pipelineId);
    dbCall = await db.LeadCallsSent.create({
      mainAgentId: assistant.mainAgentId,
      userId: assistant.userId,
      agentId: assistant.id,
      data: dataString,
      synthflowCallId: callId,
      duration: duration,
      recordingUrl: recordingUrl,
      summary: "",
      transcript: transcript,
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
      status: status,
      batchId: null,
    });
    try {
      await handleInfoExtractorValues(jsonIE, leadCad, lead, pipeline);
    } catch (error) {
      //console.log("Error handling IE details ", error);
    }
    return res.send({
      status: true,
      message: "Webhook received. No such call exists" + callId,
    });
  } //if call doesnt exist logic ends here

  //Check the infoExtractors here.
  //Update the logic here and test by sending dummy webhooks
  let leadCadenceId = dbCall.leadCadenceId;
  // if (!leadCadenceId) {
  //   console.log("Test call ");
  //   return res.send({ status: true, message: "Webhook received" });
  // }
  let leadCadence = await db.LeadCadence.findByPk(leadCadenceId);
  // if (!leadCadence) {
  //   console.log("Test call ");
  //   return res.send({ status: true, message: "Webhook received" });
  // }
  // //console.log("Hot lead ");
  let lead = await db.LeadModel.findByPk(leadCadence?.leadId);

  let jsonIE = null;
  if (lead) {
    jsonIE = await extractIEAndStoreKycs(actions, lead, callId);
  }
  console.log("All IEs ", jsonIE);
  let pipeline = await db.Pipeline.findByPk(leadCadence?.pipelineId);

  if (jsonIE) {
    try {
      await handleInfoExtractorValues(jsonIE, leadCadence, lead, pipeline);
    } catch (error) {
      console.log("Error handling IE details ", error);
    }
  }
  // //Get Transcript and save
  // let caller = await db.User.findByPk(dbCall.userId);
  // let model = await db.User.findByPk(dbCall.modelId);
  // let assistant = await db.Assistant.findOne({
  //   where: {
  //     userId: dbCall.modelId,
  //   },
  // });

  // if (data && data.lead) {
  //   data.lead.email = caller.email;
  // }

  //only generate summary if the call status is empty or null otherwise don't
  //console.log(`DB Call status${dbCall.status}`);
  if (dbCall.status == "" || dbCall.status == null) {
    dbCall.status = status;
    dbCall.duration = duration;
    dbCall.transcript = transcript;
    dbCall.recordingUrl = recordingUrl;
    dbCall.callData = dataString;
    dbCall.hotlead = jsonIE?.hotlead;
    dbCall.notinterested = jsonIE?.notinterested;
    dbCall.dnd = jsonIE?.dnd;
    dbCall.wrongnumber = jsonIE?.wrongnumber;
    dbCall.meetingscheduled = jsonIE?.meetingscheduled;
    dbCall.callmeback = jsonIE?.callmeback;
    dbCall.humancalldrop = jsonIE?.humancalldrop;
    dbCall.voicemail = jsonIE?.voicemail;
    dbCall.Busycallback = jsonIE?.Busycallback;
    dbCall.nodecisionmaker = jsonIE?.nodecisionmaker;
    dbCall.call_review_worthy = jsonIE?.call_review_worthy;
    let saved = await dbCall.save();
    // let charged = await chargeUser(caller, dbCall, assistant);
    //(dbCall.transcript != "" && dbCall.transcript != null) {
  } else {
    //console.log("Alread obtained all data");
    dbCall.status = status;
    dbCall.duration = duration;
    dbCall.transcript = transcript;
    dbCall.recordingUrl = recordingUrl;
    dbCall.callData = dataString;
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
    let saved = await dbCall.save();
  }

  //process the data here
  return res.send({ status: true, message: "Webhook received" });
};

// Function to extract the values
function extractInfo(data) {
  const result = {};

  InfoExtractors.forEach((extractor) => {
    const action = data.executed_actions[extractor.identifier];
    if (action && action.return_value) {
      const key = Object.keys(action.return_value)[0];
      result[InfoExtractors.question] = action.return_value[key];
    } else {
      result[InfoExtractors.question] = null; // If the action or value is not found
    }
  });

  //will handle kyc here

  return result;
}

async function extractIEAndStoreKycs(extractors, lead, callId) {
  let keys = Object.keys(extractors);
  let ie = {};
  for (const key of keys) {
    let data = extractors[key];
    let returnValue = data.return_value;
    let question = key.replace("info_extractor_", "");
    let answer = returnValue[question];
    ie[question] = answer;
    console.log(`IE found ${question} : ${answer}`);

    if (typeof answer == "string") {
      let created = await db.LeadKycsExtracted.create({
        question: question,
        answer: answer,
        leadId: lead.id,
        callId: callId,
      });
    } else {
      console.log("IE is not open question ");
    }
  }

  //will handle kyc here
  console.log("IE obtained ", ie);
  return ie;
  // return result;
}

async function handleInfoExtractorValues(json, leadCadence, lead, pipeline) {
  console.log("Handling IE ", json);
  let keys = Object.keys(json);
  const customStageIEs = keys.filter((str) =>
    str.includes(`${process.env.StagePrefix}_stage`)
  );
  let canMoveToDefaultStage = true;
  if (customStageIEs.length > 0) {
    console.log("Custom stage found ", customStageIEs);
    for (const csIE of customStageIEs) {
      let value = json[csIE];
      if (value) {
        canMoveToDefaultStage = false;

        let stageIdentifier = csIE.replace(
          `${process.env.StagePrefix}_stage_`,
          ""
        );
        console.log(`Move to ${stageIdentifier}`, json[csIE]);
        let stage = await db.PipelineStages.findOne({
          where: {
            identifier: stageIdentifier,
            pipelineId: pipeline.id,
          },
        });
        if (stage) {
          lead.stage = stage.id;
          let saved = await lead.save();
          console.log(`Successfully Moved to ${stageIdentifier}`, json[csIE]);
        }
        //here break the for loop
        break;
      } else {
        console.log(`Move to ${csIE}`, json[csIE]);
      }
    }
  }
  if (canMoveToDefaultStage) {
    console.log("I can move to default stage");
    if (json.hotlead || json.callbackrequested) {
      console.log("It's a hotlead");
      let hotLeadStage = await db.PipelineStages.findOne({
        where: {
          identifier: "hot_lead",
          pipelineId: pipeline.id,
        },
      });
      if (canMoveToDefaultStage) {
        lead.stage = hotLeadStage.id;
        let saved = await lead.save();
      }
      //console.log(
      //   `Lead ${lead.firstName} move from ${leadCadence.stage} to Hot Lead`
      // );
      // move the lead to the hotlead stage immediately
    }
    if (json.notinterested || json.dnd || json.wrongnumber) {
      // move the lead to the notinterested stage immediately
      let hotLeadStage = await db.PipelineStages.findOne({
        where: {
          identifier: "not_interested",
          pipelineId: pipeline.id,
        },
      });

      if (canMoveToDefaultStage) {
        lead.stage = hotLeadStage.id;
        await lead.save();
      }
      leadCadence.dnd = json.dnd;
      leadCadence.notinterested = json.notinterested;
      leadCadence.wrongnumber = json.wrongnumber;
      let saved = await leadCadence.save();
      //console.log(
      //   `Lead ${lead.firstName} move from ${leadCadence.stage} to ${hotLeadStage.stageTitle}`
      // );
    }
    if (json.meetingscheduled) {
      // meeting scheduled
      let hotLeadStage = await db.PipelineStages.findOne({
        where: {
          identifier: "booked",
          pipelineId: pipeline.id,
        },
      });

      if (canMoveToDefaultStage) {
        lead.stage = hotLeadStage.id;
      }
      // leadCadence.dnd = json.dnd;
      // leadCadence.notinterested = json.notinterested;
      let saved = await lead.save();
      //console.log(
      //   `Lead ${lead.firstName} move from ${leadCadence.stage} to ${hotLeadStage.stageTitle}`
      // );
    }
    //We may check if this was the last call or not
    if (
      json.callmeback ||
      json.humancalldrop ||
      json.voicemail ||
      json.Busycallback ||
      json.nodecisionmaker
    ) {
      let followUpStage = await db.PipelineStages.findOne({
        where: {
          identifier: "follow_up",
          pipelineId: pipeline.id,
        },
      });
      if (lead.stage < followUpStage.id) {
        if (canMoveToDefaultStage) {
          leadCadence.stage = followUpStage.id;
        }
        leadCadence.nodecisionmaker = json.nodecisionmaker;
        let saved = await lead.save();
        let cadSaved = await leadCadence.save();
        //console.log(
        //   `Lead ${lead.firstName} move from ${leadCadence.stage} to ${followUpStage.stageTitle}`
        // );
      } else {
        //console.log("User asked to call back but already on a further stage");
      }
    }
  }
}
