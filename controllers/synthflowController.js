import axios from "axios";
import JWT from "jsonwebtoken";
import db from "../models/index.js";

import path from "path";
import { fileURLToPath } from "url";
// import { CreateAndAttachAction } from "../controllers/action.controller.js";
import UserProfileFullResource from "../resources/userprofilefullresource.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
          };
          let createdAgent = CreateAssistantSynthflow(data, agentType);
        }
        res.send({
          status: true,
          message: "Agent Created",
          data: await UserProfileFullResource(user),
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
async function UpdateAssistantSynthflow(
  user,
  name,
  prompt,
  greeting,
  voice_id,
  assistantId
) {
  let synthKey = process.env.SynthFlowApiKey;
  console.log("Inside 1");
  const options = {
    method: "PUT",
    url: `https://api.synthflow.ai/v2/assistants/${assistantId}`,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${synthKey}`,
    },
    data: {
      type: "outbound",
      name: name,
      external_webhook_url: process.env.WebHookForSynthflow,
      agent: {
        llm: "gpt-4o",
        language: "en-US",
        prompt: prompt,
        greeting_message: greeting,
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

export const CreateOrUpdateAssistant = async (user) => {
  try {
    let assistant = await db.Assistant.findOne({
      where: {
        userId: user.id,
      },
    });
    let userAi = await db.UserAi.findOne({
      where: {
        userId: user.id,
      },
    });
    let masterPrompt = await GetMasterPrompt(user);
    if (assistant && assistant.modelId != null) {
      // assistant.WebHookForSynthflow;
      console.log("Already present");
      let createdAssiatant = await UpdateAssistantSynthflow(
        user,
        userAi.name,
        masterPrompt,
        userAi.greeting,
        "", //voice id

        assistant.modelId
      );
      assistant.prompt = masterPrompt;
      let saved = await assistant.save();
      //update
    } else {
      console.log("Creating new");
      // create assistant in synthflow
      let createdAssiatant = await CreateAssistantSynthflow(
        user,
        userAi.name,
        masterPrompt,
        userAi.greeting,
        ""
      );
    }
  } catch (error) {
    console.log("Error 1 ", error);
  }
};
