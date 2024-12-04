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

export const CheckCalendarAvailability = async (req, res) => {
  let modelId = req.query.assistantId || null;
  if (!modelId) {
    modelId = req.query.modelId;
  }
  if (!modelId) {
    return res.send({
      status: false,
      message: "No such model Id",
    });
  }
  console.log("Hello in Custom action Check availability", modelId);
  let q = req.query.date;
  console.log("Date that the user want to check is ", q);
  return res.send({
    status: true,
    message: "No slots are available to book",
  });
};

import { parse, isValid, format } from "date-fns";

// export async function ScheduleEvent(req, res) {
//   let { user_email, date, time } = req.body;
//   console.log("Schedule meeting with date and time: ", {
//     user_email,
//     date,
//     time,
//   });

//   let modelId = req.query.assistantId || req.query.modelId || null;
//   if (!modelId) {
//     return res.send({
//       status: false,
//       message: "No such model Id",
//     });
//   }

//   // Check if a valid model | assistant
//   let assistant = await db.Assistant.findOne({
//     where: { modelId: modelId },
//   });
//   if (!assistant) {
//     return res.send({
//       status: false,
//       message: "Meeting cannot be scheduled",
//       data: "Meeting cannot be scheduled",
//     });
//   }

//   let user = await db.User.findByPk(assistant.userId);
//   let calIntegration = await db.CalIntegration.findOne({
//     where: { userId: user.id },
//   });
//   if (!calIntegration) {
//     return res.send({
//       status: false,
//       message: "Meeting cannot be scheduled",
//       data: "Meeting cannot be scheduled",
//     });
//   }

//   // Define all possible date and time formats
//   const dateFormats = [
//     "yyyy-MM-dd",
//     "MM-dd-yyyy",
//     "MM-dd-yy",
//     "dd-MM-yyyy",
//     "dd-MM-yy",
//     "MMM, dd yyyy",
//     "MMM dd, yyyy",
//     "MMMM dd, yyyy",
//     "MMMM dd yyyy",
//     "yyyy/MM/dd",
//     "MM/dd/yyyy",
//     "dd/MM/yyyy",
//     "MM/dd/yy",
//     "dd/MM/yy",
//     "dd MMM yyyy",
//     "dd MMMM yyyy",
//     "MMM dd yyyy",
//     "MMMM d, yyyy",
//     "d MMM yyyy",
//     "d MMMM yyyy",
//     "MMM d, yyyy",
//     "MMM d yyyy",
//     "MMMM d yyyy",
//     "yyyy.MM.dd",
//     "MM.dd.yyyy",
//     "dd.MM.yyyy",
//     "dd.MM.yy",
//     "MM.dd.yy",
//     "yyyy MMM dd",
//     "yyyy MMMM dd",
//     "EEE, MMM d, yyyy",
//     "EEE, MMM dd, yyyy",
//     "EEEE, MMMM d, yyyy",
//     "EEEE, MMMM dd, yyyy",
//     "d/M/yyyy",
//     "M/d/yyyy",
//     "M/d/yy",
//     "dd-MMM-yyyy",
//     "dd-MMMM-yyyy",
//     "yyyyMMdd",
//     "MMddyyyy",
//     "ddMMyyyy",
//     "yyMMdd",
//     "dd MMM yyyy",
//     "MMMM yyyy",
//     "MMM yyyy",
//     "yyyy",
//     "yyyy-MM",
//   ];

//   const timeFormats = [
//     "HH:mm",
//     "HH:mm:ss",
//     "H:mm",
//     "H:mm:ss",
//     "hh:mm a",
//     "hh:mm:ss a",
//     "h:mm a",
//     "h:mm:ss a",
//     "hh:mmA",
//     "hh:mm:ssA",
//     "h:mmA",
//     "h:mm:ssA",
//     "hh:mm a",
//     "hh:mm:ss a",
//     "h:mm a",
//     "h:mm:ss a",
//     "HHmm",
//     "HHmmss",
//     "hhmm a",
//     "hhmmss a",
//     "hmm a",
//     "hmmss a",
//     "h:mm",
//     "h:mm:ss",
//     "H",
//     "HH",
//     "hh a",
//     "h a",
//   ];

//   // Parse the date
//   let parsedDate;
//   for (let format of dateFormats) {
//     parsedDate = parse(date, format, new Date());
//     if (isValid(parsedDate)) break;
//   }

//   if (!isValid(parsedDate)) {
//     return res.send({
//       status: false,
//       message: "Invalid date format. Please provide a recognizable date.",
//     });
//   }

//   // Parse the time
//   let parsedTime;
//   for (let format of timeFormats) {
//     parsedTime = parse(time, format, new Date());
//     if (isValid(parsedTime)) break;
//   }

//   if (!isValid(parsedTime)) {
//     return res.send({
//       status: false,
//       message: "Invalid time format. Please provide a recognizable time.",
//     });
//   }

//   // Combine parsed date and time into a single Date object
//   parsedDate.setHours(parsedTime.getHours(), parsedTime.getMinutes(), 0, 0);
//   const startTimeISO = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

//   // Consider the calendar is cal.com
//   let apiKey = calIntegration.apiKey;
//   let eventTypeId = Number(calIntegration.eventId); // Ensure this is a number

//   let inputData = {
//     start: startTimeISO, // Use combined ISO date-time string for the start time
//     eventTypeId: eventTypeId,
//     attendee: {
//       name: "Caller",
//       email: user_email,
//       timeZone: "America/New_York", // Ensure it's a valid IANA time-zone
//       // language: "en", // Ensure this is a string
//     },
//     // guests: [user.email], // Add any other guests here if needed
//     // meetingUrl: "https://example.com/meeting",
//     // location: "Zoom", // Specify location or meeting link
//     // bookingFieldsResponses: {
//     //   customField: "customValue", // Include any custom fields if required
//     // },
//     metadata: {}, // Ensure metadata is an object
//   };

//   console.log("Data sent to schedule ", JSON.stringify(inputData));
//   try {
//     const response = await fetch(`${CAL_API_URL}/bookings`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${apiKey}`,
//         "Content-Type": "application/json",
//         "cal-api-version": "v2", // Update this if necessary
//       },
//       body: JSON.stringify(inputData),
//     });

//     const responseData = await response.json();
//     if (response.ok) {
//       console.log("Event scheduled successfully:", responseData);
//       return res.send({
//         status: true,
//         message: "Event scheduled successfully",
//         data: responseData,
//       });
//     } else {
//       console.error("Error scheduling event:", responseData);
//       return res.send({
//         status: false,
//         message: "Meeting cannot be scheduled",
//         data: responseData,
//       });
//     }
//   } catch (error) {
//     console.error("Error scheduling event:", error.message);
//     return res.send({
//       status: false,
//       message: "Meeting cannot be scheduled",
//       data: "Meeting cannot be scheduled",
//       error: error.message,
//     });
//   }
// }

// export async function AddCalendar(req, res) {
//   JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
//     if (authData) {
//       let userId = authData.user.id;
//       let calendarType = req.body.calendarType; //cal_dot_com or ghl
//       let apiKey = req.body.apiKey; // for calDotCom
//       try {
//         // Fetch calendars
//         let apiClient = getApiClient(apiKey);
//         const calendarsResponse = await apiClient.get("/calendars");
//         const calendars = calendarsResponse.data;

//         console.log("Available Calendars:", calendars);

//         // Fetch event types
//         const eventTypesResponse = await apiClient.get("/event-types");
//         const eventTypes = eventTypesResponse.data;
//         let groups = eventTypes?.data?.eventTypeGroups || [];
//         let eventId15Min = null;
//         if (groups.length > 0) {
//           let actualEventTypes = groups[0].eventTypes || [];
//           if (actualEventTypes.length > 0) {
//             eventId15Min = actualEventTypes[0].id;
//           }
//         }
//         let created = await db.CalIntegration.create({
//           type: calendarType,
//           apiKey: apiKey,
//           userId: userId,
//           eventId: eventId15Min,
//         });

//         // let action = await CreateRealTimeBookingAction(
//         //   eventId15Min,
//         //   "salman@e8-labs.com"
//         // );
//         // if (action && action.status == "success") {
//         //   let actionId = action.response.action_id;
//         //   created.actionId = actionId;
//         //   let saved = await created.save();

//         //   let assistant = await db.Assistant.findOne({
//         //     where: {
//         //       userId: userId,
//         //     },
//         //   });
//         //   let attached = await AttachActionToModel(actionId, assistant.modelId);
//         //   if (attached.status == "success") {
//         //     console.log("Action attached");
//         //   }
//         // } else {
//         //   console.log("Could not create action");
//         // }
//         console.log("Available Event Types:", eventTypes);

//         // Return both calendars and event types
//         return res.send({ status: true, calendars, eventTypes });
//       } catch (error) {
//         console.error("Error retrieving calendars or event types:", error);
//         return res.send({
//           status: false,
//           message: error.message,
//           error: error,
//         });
//       }
//     }
//   });
// }

// const API_TOKEN = "1711297163700x837250103348559900";

// Function to get tomorrow's date in "YYYY-MM-DD" format
function getTomorrowDate() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export async function CreateRealTimeBookingAction(calendar_id, mainAgentName) {
  try {
    let bookingData = {
      first_appt_date: getTomorrowDate(), // Set to tomorrow's date
      max_time_slots: 2,
      min_hours_diff: 3,
      no_of_days: 2,
      timezone: "America/New_York",
      GHL: {
        calendar_id: calendar_id,
        autoconfirm: "confirmed",
        booking_title: `${mainAgentName}'s `,
      },
    };
    const response = await axios.post(
      API_URL_Synthflow_Actions,
      {
        REAL_TIME_BOOKING: {
          bookingData,
        },
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
    return {
      http_mode: "GET", // Set to tomorrow's date
      url:
        "https://www.blindcircle.com/voice/api/action/bookAppointment?modelId=" +
        assistant.modelId,
      run_action_before_call_start: false,
      name: `Book Appointment With ${user.name}`,
      description: "Book Appointment With " + user.name,
      variables_during_the_call: [
        {
          name: `date`,
          description: "The date on which the meeting would be scheduled",
          example: "User says he wants to schedule a meeting on Nov 11 2025.",
          type: "string",
        },
        {
          name: `time`,
          description: "The time at which the meeting would take place",
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
      ],
      query_parameters: [
        {
          key: "date",
          value: "11-08-2024",
        },
        {
          key: "time",
          value: "9:00 pm",
        },
        {
          key: "user_email",
          value: "salmanmajid14@gmail.com",
        },
      ],
      prompt: `Use the result from <results.data.message> and respond accordingly. Use <results.data.status> to check whether the appointment was booked or not.If true then booked else not.`,
    };
  }
  if (type == "availability") {
    return {
      http_mode: "GET", // Set to tomorrow's date
      url:
        "https://www.blindcircle.com/voice/api/action/checkAvailability?modelId=" +
        assistant.modelId,
      run_action_before_call_start: false,
      name: `Check Availability For ${user.name}`,
      description: "Check Availability For " + user.name,
      variables_during_the_call: [
        {
          name: `date`,
          description:
            "Whenever a user asks for availability for meeting or one to one session, trigger this function.",
          example: "User queries for your availability.",
          type: "string",
        },
      ],
      query_parameters: [
        {
          key: "date",
          value: "11-08-2024",
        },
      ],
      prompt: `Use the result from <results.data.message> and respond accordingly.`,
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
      `Action for infoExtractor Create Response User ${assistant.id} created = `,
      attached
    );
  }
  return true;
}
