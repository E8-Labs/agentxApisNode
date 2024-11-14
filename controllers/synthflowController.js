import axios from "axios";
import JWT from "jsonwebtoken";
import db from "../models/index.js";

import path from "path";
import { fileURLToPath } from "url";
// import { CreateAndAttachAction } from "../controllers/action.controller.js";
import UserProfileFullResource from "../resources/userProfileFullResource.js";
import KycResource from "../resources/kycResource.js";
import {
  CreateAndAttachInfoExtractor,
  GetInfoExtractorApiData,
} from "./actionController.js";
import AgentResource from "../resources/AgentResource.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function GetVoices(req, res) {
  try {
    let synthKey = process.env.SynthFlowApiKey;
    console.log("Synth key is ", synthKey);

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
      const agentType = req.body.agentType; //inbound, outbound, both
      const status = req.body.status;
      const address = req.body.address;
      const agentObjectiveDescription = req.body.agentObjectiveDescription;

      let mainAgent = await db.MainAgentModel.create({
        name: name,
        userId: user.id,
      });

      if (!mainAgent) {
        console.log("Error creating main agent ");
        return;
      }

      try {
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
          };
          let createdInbound = CreateAssistantSynthflow(data, "inbound");
          let createdOutbound = CreateAssistantSynthflow(data, "outbound");
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
          };
          let createdAgent = CreateAssistantSynthflow(data, agentType);
        }

        let agentRes = await AgentResource(mainAgent);
        res.send({
          status: true,
          message: "Agent Created",
          data: agentRes,
        });
      } catch (error) {
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

export const GetKyc = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let kycs = await db.KycModel.findAll({
        where: {
          userId: user.id,
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

      let kycs = [];

      if (user) {
        for (let i = 0; i < kycQuestions.length; i++) {
          let kyc = kycQuestions[i];
          let created = await db.KycModel.create({
            userId: user.id,
            question: kyc.question,
            category: kyc.category, //Needs, Motivation, Urgency etc
            type: kyc.type, //seller or buyer
            mainAgentId: mainAgentId,
          });

          let kycExamples = [];
          if (created) {
            for (let j = 0; j < kyc.examples.length; j++) {
              let ex = kyc.examples[j];
              let createdEx = await db.KycExampleModel.create({
                kycId: created.id,
                example: ex,
              });
              kycExamples.push(createdEx);
            }
          }
          // created.actionId =
          let infoExtractor = await CreateAndAttachInfoExtractor(
            mainAgentId,
            kyc
          );
          let res = await KycResource(created);
          kycs.push(res);
        }
      }

      return res.send({ status: true, message: "kyc added", data: kycs });
    } else {
    }
  });
};

export async function CreateAssistantSynthflow(agentData, type = "outbound") {
  let synthKey = process.env.SynthFlowApiKey;
  console.log("Inside 1");
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
  console.log("Inside 2");
  try {
    let result = await axios.request(options);
    console.log("Inside 3");
    console.log("Create Assistant Api result ", result);

    if (result.status == 200) {
      let assistant = await db.AgentModel.create({
        ...agentData,
        modelId: result.data?.response?.model_id || null,
      });
      if (assistant) {
        // try {
        //   let createdAction = await CreateAndAttachAction(user, "kb");
        // } catch (error) {
        //   console.log("Error creating action kb ", error);
        // }
        // try {
        //   let createdAction = await CreateAndAttachAction(user, "booking");
        // } catch (error) {
        //   console.log("Error creating action booking ", error);
        // }
        // try {
        //   let createdAction = await CreateAndAttachAction(user, "availability");
        // } catch (error) {
        //   console.log("Error creating action availability ", error);
        // }
      }
    }
    return result;
  } catch (error) {
    console.log("Inside error: ", error);
    return null;
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
  console.log("Inside 2");
  try {
    let result = await axios.request(options);
    console.log("Inside 3");
    console.log("Create Assistant Api result ", result);

    if (result.status == 200) {
      console.log("Assitant updated");
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
    console.log("Inside error: ", error);
    return null;
  }
}

// export const CreateOrUpdateAssistant = async (user) => {
//   try {
//     let assistant = await db.Assistant.findOne({
//       where: {
//         userId: user.id,
//       },
//     });
//     let userAi = await db.UserAi.findOne({
//       where: {
//         userId: user.id,
//       },
//     });
//     let masterPrompt = await GetMasterPrompt(user);
//     if (assistant && assistant.modelId != null) {
//       // assistant.WebHookForSynthflow;
//       console.log("Already present");
//       let createdAssiatant = await UpdateAssistantSynthflow(
//         user,
//         userAi.name,
//         masterPrompt,
//         userAi.greeting,
//         "", //voice id

//         assistant.modelId
//       );
//       assistant.prompt = masterPrompt;
//       let saved = await assistant.save();
//       //update
//     } else {
//       console.log("Creating new");
//       // create assistant in synthflow
//       let createdAssiatant = await CreateAssistantSynthflow(
//         user,
//         userAi.name,
//         masterPrompt,
//         userAi.greeting,
//         ""
//       );
//     }
//   } catch (error) {
//     console.log("Error 1 ", error);
//   }
// };
