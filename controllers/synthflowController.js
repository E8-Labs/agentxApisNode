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
  CreateInfoExtractor,
  GetInfoExtractorApiData,
} from "./actionController.js";
import AgentResource from "../resources/AgentResource.js";
import LeadCadence from "../models/pipeline/LeadsCadence.js";
import { InfoExtractors } from "../config/defaultInfoExtractors.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MakeACall = async (lead, mainAgentModel, leadCadence) => {
  // setLoading(true);
  let PhoneNumber = lead.phone;
  let Name = lead.firstName;
  let LastName = lead.lastName || "";
  // let Email = req.body.email;
  // let model = req.body.model || "tate";
  // let modelId = assistant.modelId;

  let assistant = await db.AgentModel.findOne({
    where: {
      mainAgentId: mainAgentModel.id,
      outbound: "outbound",
    },
  });

  if (!assistant) {
    console.log("No Assistant found");
    return res.send({
      status: false,
      message: "No such assistant",
      // data: modelId,
      reason: "no_such_assistant",
    });
  }

  console.log("Calling assistant", assistant.name);
  console.log("Model ", assistant.modelId);
  try {
    let basePrompt = assistant.prompt || "";
    basePrompt = basePrompt.replace(/{prospect_name}/g, Name);
    basePrompt = basePrompt.replace(/{phone}/g, PhoneNumber);
    basePrompt = basePrompt.replace(/{email}/g, Email);
    // kbPrompt = kbPrompt.replace(/{username}/g, user.username);
    //find if any previous calls exist
    console.log("#############################################\n");
    console.log("Base prompt being sent ", basePrompt);
    console.log("#############################################\n");

    let data = JSON.stringify({
      name: Name,
      phone: PhoneNumber,
      model: assistant.modelId, //"1722652829145x214249543190325760",
      prompt: basePrompt,
    });
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

    axios
      .request(config)
      .then(async (response) => {
        let json = response.data;
        console.log(json);
        if (json.status === "ok" || json.status === "success") {
          let callId = json.response.call_id;
          // let savedToGhl = await PushDataToGhl(
          //   Name,
          //   LastName,
          //   Email,
          //   PhoneNumber,
          //   callId
          // );
          let saved = await db.LeadCallsSent.create({
            leadCadenceId: leadCadence.id,
            synthflowCallId: callId,
            leadId: lead.id,
            transcript: "",
            summary: "",
            duration: "",
            status: "",
            // model: assistant.name,
            mainAgentId: mainAgentModel.id,
          });
          console.log("Saved ", saved);
          res.send({ status: true, message: "call is initiated ", data: json });
        } else {
          let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error Notification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
    }
    .content {
      font-size: 16px;
      color: #333;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 14px;
      color: #888;
    }
    .error {
      color: #D8000C;
      background-color: #FFD2D2;
      border: 1px solid #D8000C;
      padding: 10px;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Error Notification</h2>
    </div>
    <div class="content">
      <p>Dear Team,</p>
      <p>An error occurred while attempting to start a voice call. Below are the details:</p>
      <div class="error">
        <p><strong>Status:</strong> Error</p>
        <p><strong>Message:</strong> ${json.response.answer}.</p>
        <p><strong>Model ID:</strong> ${assistant.modelId}</p>
      </div>
      <p>Please review the issue and take appropriate action.</p>
      <p>Best regards,</p>
      <p>Your Automated Notification System</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Your Company. All Rights Reserved.</p>
    </div>
  </div>
</body>
</html>
`;
          let sent = SendMail(
            "noahdeveloperr@gmail.com",
            "Call Failed",
            "",
            html
          );
          let sentSalman = SendMail(
            "salman@e8-labs.com",
            "Call Failed",
            "",
            html
          );
          console.log("Emails sent ", sentSalman);
          res.send({
            status: false,
            message: "call is not initiated",
            data: json,
          });
        }
      })
      .catch((error) => {
        console.log(error);

        ///check and send email
        let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error Notification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
    }
    .content {
      font-size: 16px;
      color: #333;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 14px;
      color: #888;
    }
    .error {
      color: #D8000C;
      background-color: #FFD2D2;
      border: 1px solid #D8000C;
      padding: 10px;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Error Notification</h2>
    </div>
    <div class="content">
      <p>Dear Team,</p>
      <p>An error occurred while attempting to start a voice call. Below are the details:</p>
      <div class="error">
        <p><strong>Status:</strong> Error</p>
        <p><strong>Message:</strong> ${error.response.answer}.</p>
        <p><strong>Model ID:</strong> ${assistant.modelId}</p>
      </div>
      <p>Please review the issue and take appropriate action.</p>
      <p>Best regards,</p>
      <p>Your Automated Notification System</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Your Company. All Rights Reserved.</p>
    </div>
  </div>
</body>
</html>
`;
        let sent = SendMail(
          "noahdeveloperr@gmail.com",
          "Call Failed",
          "",
          html
        );
        let sentSalman = SendMail(
          "salman@e8-labs.com",
          "Call Failed",
          "",
          html
        );
        console.log("Emails sent ", sentSalman);
        res.send({
          status: false,
          message: "call is not initiated",
          data: null,
        });
      });
  } catch (error) {
    console.error("Error occured is :", error);
    res.send({ status: false, message: "call is not initiated", data: null });
  }
};

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
      const agentObjectiveId = req.body.agentObjectiveId;
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
            agentObjectiveId: agentObjectiveId,
          };
          let createdInbound = await CreateAssistantSynthflow(
            data,
            "inbound",
            mainAgent
          );
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
          };
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
            console.log("Voice updated to agent on synthflow", a.modelId);
          }
        }
      }

      if (req.body.prompt) {
        for (let i = 0; i < agents.length; i++) {
          let a = agents[i];
          a.prompt = req.body.prompt;
          let saved = await a.save();
          console.log("Prompt updated to agent");
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

export async function CreateAssistantSynthflow(
  agentData,
  type = "outbound",
  mainAgent
) {
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
        try {
          let extractors = InfoExtractors;
          for (let i = 0; i < extractors.length; i++) {
            let extr = extractors[i];
            let created = await CreateAndAttachInfoExtractor(
              mainAgent.id,
              extr
            );
          }
          // let createdAction = await CreateAndAttachAction(user, "kb");
        } catch (error) {
          console.log("Error creating action kb ", error);
        }
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

//Webhook
export const WebhookSynthflow = async (req, res) => {
  // console.log("Request headers:", req.headers);
  // console.log("Request body:", req.body);
  // console.log("Request raw data:", req);

  let data = req.body;
  // console.log("Webhook data is ", data);

  let dataString = JSON.stringify(data);

  let callId = data.call.call_id;
  let status = data.call.status;
  let duration = data.call.duration;
  let transcript = data.call.transcript;
  let recordingUrl = data.call.recording_url;
  let actions = data.executed_actions;
  // console.log("Actions ", actions);

  let json = extractInfo(data, InfoExtractors);
  console.log("Extracted info ", json);
  // return;
  let dbCall = await db.LeadCallsSent.findOne({
    where: {
      synthflowCallId: callId,
    },
  });
  if (!dbCall) {
    return res.send({
      status: true,
      message: "Webhook received. No such call exists",
    });
  }

  //Check the infoExtractors here.
  //Update the logic here and test by sending dummy webhooks
  let leadCadenceId = dbCall.leadCadenceId;
  let leadCadence = await db.LeadCadence.findByPk(leadCadenceId);
  // console.log("Hot lead ");
  let lead = await db.LeadModel.findByPk(leadCadence.leadId);

  let pipeline = await db.Pipeline.findByPk(leadCadence.pipelineId);
  if (json.hotlead) {
    let hotLeadStage = await db.PipelineStages.findOne({
      where: {
        identifier: "hot_lead",
      },
    });
    leadCadence.stage = hotLeadStage.id;
    let saved = await leadCadence.save();
    console.log(
      `Lead ${lead.firstName} move from ${leadCadence.stage} to Hot Lead`
    );
    // move the lead to the hotlead stage immediately
  }
  if (json.notinterested || json.dnd) {
    // move the lead to the notinterested stage immediately
    let hotLeadStage = await db.PipelineStages.findOne({
      where: {
        identifier: "not_interested",
      },
    });
    leadCadence.stage = hotLeadStage.id;
    leadCadence.dnd = json.dnd;
    leadCadence.notinterested = json.notinterested;
    let saved = await leadCadence.save();
    console.log(
      `Lead ${lead.firstName} move from ${leadCadence.stage} to ${hotLeadStage.stageTitle}`
    );
  }
  if (json.meetingscheduled) {
    // meeting scheduled
  }
  //We may check if this was the last call or not
  if (json.callmeback || json.humancalldrop || json.voicemail) {
    let followUpStage = await db.PipelineStages.findOne({
      where: {
        identifier: "follow_up",
      },
    });
    if (leadCadence.stage < followUpStage.id) {
      leadCadence.stage = followUpStage.id;
      let saved = await leadCadence.save();
      console.log(
        `Lead ${lead.firstName} move from ${leadCadence.stage} to ${followUpStage.stageTitle}`
      );
    } else {
      console.log("User asked to call back but already on a further stage");
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
  console.log(`DB Call status${dbCall.status}`);
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
    console.log("Alread obtained all data");
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
function extractInfo(data, extractors) {
  const result = {};

  extractors.forEach((extractor) => {
    const action = data.executed_actions[extractor.identifier];
    if (action && action.return_value) {
      const key = Object.keys(action.return_value)[0];
      result[extractor.question] = action.return_value[key];
    } else {
      result[extractor.question] = null; // If the action or value is not found
    }
  });

  return result;
}
