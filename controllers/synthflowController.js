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
import LeadCadence from "../models/pipeline/LeadsCadence.js";
import {
  InfoExtractors,
  OpenQuestionInfoExtractors,
} from "../config/defaultInfoExtractors.js";
import { AgentObjectives } from "../constants/defaultAgentObjectives.js";
import AgentPromptModel from "../models/user/agentPromptModel.js";
import { userInfo } from "os";
import { Objections, Guardrails } from "../constants/defaultObjections.js";
import {
  GetColumnsInSheet,
  mergeAndRemoveDuplicates,
} from "./LeadsController.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function GetCompletePromptTextFrom(prompt, user, assistant, lead) {
  let callScript = prompt.callScript;

  let greeting = prompt.greeting;
  greeting = greeting.replace(/{agent_name}/g, assistant.name);
  greeting = greeting.replace(/{brokerage_name}/g, user.brokerage);

  callScript = callScript.replace(/{agent_name}/g, assistant.name);
  callScript = callScript.replace(/{brokerage_name}/g, user.brokerage);

  callScript = callScript.replace(/{CU_status}/g, assistant.status);
  callScript = callScript.replace(/{CU_address}/g, assistant.name.address);

  //Get UniqueColumns in Sheets
  let sheets = await db.LeadSheetModel.findAll({
    where: {
      userId: user.id,
    },
  });
  if (sheets && sheets.length > 0) {
    let keys = [];
    for (const sheet of sheets) {
      let sheetKeys = await GetColumnsInSheet(sheet.id);
      keys = mergeAndRemoveDuplicates(keys, sheetKeys);
    }
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

  //console.log("New Objection Text is ", objectionPromptText);

  //udpate the call script here
  let text = "";

  text = `${text}\n\n${prompt.objective}\n\n`;
  text = `${text}\n\n${prompt.companyAgentInfo}`;
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

export const MakeACall = async (leadCadence, simulate = false, calls = []) => {
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
      synthflowCallId: `CallNo-${calls.length}-LeadCadId-${leadCadence.id}-${leadCadence.stage}`,
      stage: leadCadence.stage,
      status: "",
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
      mainAgentModel
    );
    return res;
    //initiate call here
  } catch (error) {
    console.error("Error occured is :", error);
    return { status: false, message: "call is not initiated", data: null };
  }
};

async function initiateCall(
  data,
  leadCadence,
  lead,
  assistant,
  mainAgentModel
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
    const json = response.data;

    //console.log(json);
    //console.log("Assistant used ", json.response);

    if (json.status === "ok" || json.status === "success") {
      const callId = json.response.call_id;
      //console.log("Call id ", callId);

      try {
        const saved = await db.LeadCallsSent.create({
          leadCadenceId: leadCadence.id,
          synthflowCallId: callId,
          leadId: lead.id,
          transcript: "",
          summary: "",
          status: "",
          agentId: assistant.id,
          stage: leadCadence.stage,
          mainAgentId: mainAgentModel.id,
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
      //console.log("In else: call not initiated");
      // Add failed call in the database if required
      return { status: false, message: "call is not initiated", data: null };
    }
  } catch (error) {
    //console.log("Error during API call: ", error);
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
      for (const obj of Objections) {
        let created = await db.ObjectionAndGuradrails.create({
          title: obj.title,
          description: obj.description,
          type: "objection",
          mainAgentId: mainAgent.id,
        });
      }
      for (const obj of Guardrails) {
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

      let kycSellerText = "";
      let kycBuyerText = "";
      let kycs = [];

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
          let newSellerKycCount = 0,
            newBuyerKycCount = 0;
          if (created) {
            if (kyc.type == "seller") {
              newSellerKycCount += 1;
              kycSellerText = `${kycSellerText}\n${kyc.question}`;
            } else {
              newBuyerKycCount += 1;
              kycBuyerText = `${kycBuyerText}\n${kyc.question}`;
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
          if (prompts && prompts.length > 0) {
            if (
              kycBuyerBefore &&
              kycBuyerBefore.length == 0 &&
              newBuyerKycCount > 0
            ) {
              //console.log(
              //   "No Buyer kyc already added replacing buyer",
              //   kycBuyerText
              // );
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
              //console.log(
              //   "No seller kyc already added replacing seller",
              //   kycSellerText
              // );
              for (let p of prompts) {
                let callScript = p.callScript;
                callScript = callScript.replace(/{seller_kyc}/g, kycSellerText);
                // callScript = callScript.replace(/{buyer_kyc}/g, buyer_kyc);
                p.callScript = callScript;
                await p.save();
              }
            }
          }
          // let found = null;
          // let OpenQuestions = OpenQuestionInfoExtractors;
          // OpenQuestions.map((item) => {
          //   // //console.log(`Comp ${item.question} = ${kyc.question}`);
          //   if (item.question == kyc.question) {
          //     found = item;
          //   }
          // });
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
          // created.actionId =

          // if (infoExtractor) {
          //   await db.InfoExtractorModel.create({
          //     actionId: infoExtractor.action_id,
          //     actionType: infoExtractor.action_type,
          //     mainAgentId: mainAgentId,
          //     data: JSON.stringify(infoExtractor),
          //   });
          // }
          let res = await KycResource(created);
          kycs.push(res);
        }
      }

      return res.send({ status: true, message: "kyc added", data: kycs });
    } else {
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
  //console.log("Webhook data is ", data);

  let dataString = JSON.stringify(data);

  let callId = data.call.call_id;
  let modelId = data.call.model_id;
  let status = data.call.status;
  let duration = data.call.duration;
  let transcript = data.call.transcript;
  let recordingUrl = data.call.recording_url;
  let actions = data.executed_actions;
  // //console.log("Actions ", actions);

  let json = extractInfo(data);
  //console.log("Extracted info ", json);
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
      console.log("Data for custom stage is ", data);
    } else {
    }
  });
  console.log("All custom infoExtractors", allCustomStageInfoExtractorkeys);
  if (!dbCall) {
    console.log("Call is not already in the table.");

    //create new call
    let leadData = data.lead;
    let leadPhone = leadData.phone_number;
    leadPhone = leadPhone.replace("+", "");
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
    if (assistant && assistant.agentType == "inbound") {
    }

    //get pipeline and leadCad
    let leadCad = await db.LeadCadence.findOne({
      where: {
        leadId: lead.id,
        mainAgentId: assistant.mainAgentId,
      },
    });
    if (!leadCad) {
      console.log("Couldn't found any leadCadence");
      return;
    }

    let pipeline = await db.Pipeline.findByPk(leadCad.pipelineId);
    dbCall = await db.LeadCallsSent.create({
      mainAgentId: assistant.mainAgentId,
      userId: assistant.userId,
      agentId: assistant.id,
      data: dataString,
      synthflowCallId: callId,
      duration: duration,
      recordingUrl: recordingUrl,
      summary: summary,
      transcript: transcript,
      leadId: leadCad.leadId,
      leadCadenceId: leadCad.leadCad.id,
      status: status,
    });
    try {
      await handleInfoExtractorValues(json, leadCad, lead, pipeline);
    } catch (error) {
      //console.log("Error handling IE details ", error);
    }
    return res.send({
      status: true,
      message: "Webhook received. No such call exists" + callId,
    });
  }

  //Check the infoExtractors here.
  //Update the logic here and test by sending dummy webhooks
  let leadCadenceId = dbCall.leadCadenceId;
  let leadCadence = await db.LeadCadence.findByPk(leadCadenceId);
  // //console.log("Hot lead ");
  let lead = await db.LeadModel.findByPk(leadCadence.leadId);

  let pipeline = await db.Pipeline.findByPk(leadCadence.pipelineId);

  try {
    await handleInfoExtractorValues(json, leadCadence, lead, pipeline);
  } catch (error) {
    //console.log("Error handling IE details ", error);
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

async function handleInfoExtractorValues(json, leadCadence, lead, pipeline) {
  if (json.hotlead || json.callbackrequested) {
    let hotLeadStage = await db.PipelineStages.findOne({
      where: {
        identifier: "hot_lead",
        pipelineId: pipeline.id,
      },
    });
    leadCadence.stage = hotLeadStage.id;
    let saved = await leadCadence.save();
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
    leadCadence.stage = hotLeadStage.id;
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
    leadCadence.stage = hotLeadStage.id;
    // leadCadence.dnd = json.dnd;
    // leadCadence.notinterested = json.notinterested;
    let saved = await leadCadence.save();
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
    if (leadCadence.stage < followUpStage.id) {
      leadCadence.stage = followUpStage.id;
      leadCadence.nodecisionmaker = json.nodecisionmaker;
      let saved = await leadCadence.save();
      //console.log(
      //   `Lead ${lead.firstName} move from ${leadCadence.stage} to ${followUpStage.stageTitle}`
      // );
    } else {
      //console.log("User asked to call back but already on a further stage");
    }
  }
}
