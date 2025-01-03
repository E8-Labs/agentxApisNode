import axios from "axios";
import db from "../models/index.js";
import JWT from "jsonwebtoken";
// import { findVectorData } from "../services/pindeconedb.js";

const API_TOKEN = "cal_live_b983ff59c6bdf60aa77797acbd31a05f";
const CAL_API_URL = "https://api.cal.com/v2";

const API_URL_Synthflow_Actions = "https://api.synthflow.ai/v2/actions";

function getApiClient(apiKey) {
  const apiClient = axios.create({
    baseURL: CAL_API_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  return apiClient;
}

async function CreateCustomAction(user, assistant, type = "kb") {
  try {
    const response = await axios.post(
      API_URL_Synthflow_Actions,
      {
        CUSTOM_ACTION: GetActionApiData(user, assistant, type),
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SynthFlowApiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
    console.log("Booking response:", response.data);
  } catch (error) {
    console.error(
      "Error booking appointment:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
}

export async function AttachActionToModel(actionId, modelId) {
  try {
    const response = await axios.post(
      API_URL_Synthflow_Actions + "/attach",
      {
        model_id: modelId,
        actions: Array.isArray(actionId) ? actionId : [actionId],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SynthFlowApiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Action attached successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error attaching action to model:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
}

function GetActionApiData(user, assistant, type = "kb") {
  if (type == "kb") {
    return {
      http_mode: "GET", // Set to tomorrow's date
      url:
        "https://www.blindcircle.com/voice/api/action/getKb?modelId=" +
        assistant.modelId,
      run_action_before_call_start: false,
      name: `Get Data From ${user.name} Knowledgebase`,
      description: "Gets knowledgebase for " + user.name,
      variables_during_the_call: [
        {
          name: `user_question`,
          description:
            "Whenever a user asks a question, this action will be triggered to retrieve the information from database",
          example:
            "user question like what do you think about the gender equality?",
          type: "string",
        },
      ],
      query_parameters: [
        {
          key: "user_question",
          value: "what do you think about the gender equality?",
        },
      ],
      prompt: `Use the result from <results.data.message> and respond accordingly`,
    };
  }
  if (type == "booking") {
    return GetCalendarActionApiData(user, assistant);
  }
  if (type == "availability") {
    return {
      http_mode: "GET", // Set to tomorrow's date
      url:
        "https://www.blindcircle.com/agentx/api/calendar/getAvailability?mainAgentId=" +
        assistant.mainAgentId +
        `&agentId=${assistant.id}`,
      run_action_before_call_start: true,
      name: `Check Availability For ${user.name}`,
      description:
        "Use the Check Availability action to verify the user's calendar for open time slots when booking a meeting, appointment, or event. Ensure you accurately query their schedule to find suitable availability and provide relevant options. ",
      speech_while_using_the_tool: "One second, let me check the calendar",
      variables_during_the_call: [
        // {
        //   name: `date`,
        //   description:
        //     "Whenever a user asks for availability for meeting or one to one session, trigger this function.",
        //   example: "User queries for your availability.",
        //   type: "string",
        // },
      ],
      query_parameters: [
        // {
        //   key: "date",
        //   value: "11-08-2024",
        // },
      ],
      prompt: `You can use <results.data.data>   to check for the calendar availability for the user`,
    };
  }
}
export async function CreateAndAttachAction(user, type = "kb") {
  let assistant = await db.Assistant.findOne({
    where: {
      userId: user.id,
    },
  });
  let action = await CreateCustomAction(user, assistant, type);
  if (action && action.status == "success") {
    let actionId = action.response.action_id;
    // created.actionId = actionId;
    let createdAction = await db.CustomAction.create({
      userId: user.id,
      type: type,
      actionId: actionId,
    });
    // let saved = await created.save();

    let attached = await AttachActionToModel(actionId, assistant.modelId);
    console.log(
      `Action for ${type} Create Response User ${user.id} created = `,
      attached
    );
    if (attached.status == "success") {
      console.log("Action attached");
      return true;
    } else {
      return false;
    }
  } else {
    console.log("Could not create action");
    return false;
  }
}

//#######################    Info Extractors     ##########################
export async function CreateInfoExtractor(kyc) {
  try {
    const response = await axios.post(
      API_URL_Synthflow_Actions,
      GetInfoExtractorApiData(kyc),
      {
        headers: {
          Authorization: `Bearer ${process.env.SynthFlowApiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Info Extractor response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error Info Extractor:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
}
export function GetInfoExtractorApiData(kyc) {
  if (kyc.actionType == "live_transfer") {
    return {
      LIVE_TRANSFER: {
        phone: kyc.phone,
        instructions: kyc.instructions || "",
        timeout: 30,
      },
    };
  } else if (kyc.actiontype && kyc.actiontype == "open_question") {
    return {
      INFORMATION_EXTRACTOR: {
        OPEN_QUESTION: {
          identifier: kyc.question,
          description: kyc.description || kyc.question,
          examples: kyc.examples,
        },
      },
    };
  } else if (kyc.actiontype && kyc.actiontype == "yes_no") {
    return {
      INFORMATION_EXTRACTOR: {
        YES_NO: {
          identifier: kyc.question,
          description: kyc.description || kyc.question,
          examples: kyc.examples,
        },
      },
    };
  } else {
    return {
      INFORMATION_EXTRACTOR: {
        OPEN_QUESTION: {
          identifier: kyc.question,
          description: kyc.description || kyc.question,
          examples: kyc.examples,
        },
      },
    };
  }
}

export async function CreateAndAttachInfoExtractor(mainAgentId, kyc) {
  let assistants = await db.AgentModel.findAll({
    where: {
      mainAgentId: mainAgentId,
    },
  });
  let action = await CreateInfoExtractor(kyc);
  if (action && action.status == "success") {
    let actionId = action.response.action_id;
    // created.actionId = actionId;
    // let createdAction = await db.CustomAction.create({
    //   userId: user.id,
    //   type: "infoExtractor",
    //   actionId: actionId,
    // });
    // let saved = await created.save();

    for (let i = 0; i < assistants.length; i++) {
      let assistant = assistants[i];
      let attached = await AttachActionToModel(actionId, assistant.modelId);
      console.log(
        `Action for infoExtractor Create Response User ${assistant.id} created = `,
        attached
      );
    }
    return action.response;
    // if (attached.status == "success") {
    //   console.log("Action attached");
    //   return true;
    // } else {
    //   return false;
    // }
  } else {
    console.log("Could not create action");
    return false;
  }
}

export async function AttachInfoExtractor(mainAgentId, actionIds) {
  let assistants = await db.AgentModel.findAll({
    where: {
      mainAgentId: mainAgentId,
    },
  });

  for (let i = 0; i < assistants.length; i++) {
    let assistant = assistants[i];
    let attached = await AttachActionToModel(actionIds, assistant.modelId);
    console.log(
      `Action for infoExtractor Create Response assitant ${assistant.modelId} created = `,
      attached
    );
  }
  return true;
}

export async function CreateAndAttachCalendarAction(
  user,
  mainAgent,
  agentId = null
) {
  let assistants = await db.AgentModel.findAll({
    where: {
      mainAgentId: mainAgent.id,
    },
  });
  if (agentId) {
    let agent = await db.AgentModel.findByPk(agentId);
    if (agent) {
      assistants = [agent];
    }
  }
  let actionIds = [];
  if (assistants) {
    for (const assistant of assistants) {
      let action = await CreateCustomAction(user, assistant, "booking");

      if (action && action.status == "success") {
        let actionId = action.response.action_id;
        actionIds.push(actionId);
        let attached = await AttachActionToModel(actionId, assistant.modelId);
        console.log(
          `Action for booking Create Response User ${user.id} created = `,
          attached
        );

        let actionAv = await CreateCustomAction(
          user,
          assistant,
          "availability"
        );
        if (actionAv && actionAv.status == "success") {
          let actionAvId = actionAv.response.action_id;
          actionIds.push(actionAvId);
          let attachedAv = await AttachActionToModel(
            actionAvId,
            assistant.modelId
          );
          console.log(
            `Action for booking Create Response User ${user.id} created = `,
            attachedAv
          );
        }
        if (attached.status == "success") {
          console.log("Action attached");
        } else {
          // return { status: false, data: null };
        }
      } else {
        console.log("Could not create action");
        // return { status: false, data: null };
      }
    }
    return { status: true, data: actionIds };
  } else {
    return { status: false, data: null, message: "No assistant found" };
  }
}

function GetCalendarActionApiData(user, assistant) {
  return {
    http_mode: "POST", // Set to tomorrow's date
    url:
      "https://www.blindcircle.com/agentx/api/calendar/schedule?modelId=" +
      assistant.id +
      `&mainAgentId=${assistant.mainAgentId}` +
      `&agentId=${assistant.id}`,
    run_action_before_call_start: false,
    name: `Book Appointment With ${assistant.name}`,
    description:
      "Use the Create a Booking action to schedule a meeting, appointment, or event directly in the user's calendar. Ensure the booking aligns with the user's preferences and availability to avoid conflicts.",
    speech_while_using_the_tool: "One second, let me check the calendar",
    variables_during_the_call: [
      {
        name: `date`,
        description:
          "The date (ISO 8601 format) on which the meeting would be scheduled i-e if user provides Nov 5 2025 then you would send 2025-11-05 in the action",
        example:
          "User says he wants to schedule a meeting on Nov 05 2025. ISO 8601 converted is 2025-11-05",
        type: "string",
      },
      {
        name: `time`,
        description:
          "The time (ISO 8601 format)  at which the meeting would take place ",
        example: "9:00 pm",
        type: "string",
      },
      {
        name: `user_email`,
        description:
          "The email of the user who will receive the meeting invite",
        example: "my email is (abc@gmail.com).",
        type: "string",
      },
      {
        name: `lead_phone`,
        description:
          "The phone of the lead who will receive the meeting invite. You already have this as Lead Info",
        example: "Lead Phone: 14086799068",
        type: "string",
      },
      {
        name: `lead_name`,
        description:
          "The name of the lead who will receive the meeting invite. You already have this as Lead Name",
        example: "Lead Name: (Noah).",
        type: "string",
      },
    ],
    query_parameters: [
      {
        key: "date",
        value: "2025-02-20",
      },
      {
        key: "time",
        value: "9:00 PM",
      },
      {
        key: "user_email",
        value: "salmanmajid14@gmail.com",
      },
    ],
    json_body_stringified: JSON.stringify({
      date: "<date>",
      time: "<time>",
      user_email: "<user_email>",
      lead_phone: "<lead_phone>",
      lead_name: "<lead_name>",
    }),
    prompt: `Use the result from <results.data.message> and respond accordingly. Use <results.data.status> to check whether the appointment was booked or not.If true then booked else not. To get more idea use <result.data.data>`,
  };
}

export async function UpdateLiveTransferAction(action, phoneNumber) {
  try {
    let kyc = { phone: phoneNumber, actionType: "live_transfer" };
    const response = await axios.post(
      API_URL_Synthflow_Actions + `/${action}`,
      GetInfoExtractorApiData(kyc),
      {
        headers: {
          Authorization: `Bearer ${process.env.SynthFlowApiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Live Transfer update response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error Info Extractor:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
}
