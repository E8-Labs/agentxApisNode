import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import GHL from "../utils/ghl.js";

import {
  AttachActionToModel,
  CreateAndAttachCalendarAction,
} from "./actionController.js";
import { UpdateAssistantSynthflow } from "./synthflowController.js";
import {
  CreateAndAttachAction,
  CreateAndAttachInfoExtractor,
} from "./actionController.js";

import { parse, isValid, format } from "date-fns";

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

// Function to get tomorrow's date in "YYYY-MM-DD" format
function getTomorrowDate() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

// export const CheckCalendarAvailability = async (req, res) => {
//   let modelId = req.query.assistantId || null;
//   if (!modelId) {
//     modelId = req.query.modelId;
//   }
//   if (!modelId) {
//     return res.send({
//       status: false,
//       message: "No such model Id",
//     });
//   }
//   console.log("Hello in Custom action Check availability", modelId);
//   let q = req.query.date;
//   console.log("Date that the user want to check is ", q);
//   return res.send({
//     status: true,
//     message: "No slots are available to book",
//   });
// };

// import fetch from "node-fetch"; // Make sure to install this package if needed

async function getAllSchedules(apiKey) {
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`, // Replace with your actual token
      "cal-api-version": "2024-06-11", // Default API version
    },
  };

  try {
    const response = await fetch("https://api.cal.com/v2/schedules", options);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const schedulesResponse = await response.json(); // Directly parse the JSON array
    console.log(
      "Raw Schedules Response:",
      JSON.stringify(schedulesResponse, null, 2)
    );

    // Parse and format the schedules
    const formattedSchedules = schedulesResponse.data.map((schedule) => ({
      id: schedule.id,
      name: schedule.name,
      timeZone: schedule.timeZone,
      availability: schedule.availability.map((availability) => ({
        days: availability.days,
        startTime: availability.startTime,
        endTime: availability.endTime,
      })),
      isDefault: schedule.isDefault,
    }));

    console.log("Parsed Schedules:");
    console.log(JSON.stringify(formattedSchedules, null, 2));

    return formattedSchedules;
  } catch (error) {
    console.error("Error fetching schedules:", error.message);
    return null;
  }
}

export async function CheckCalendarAvailability(req, res) {
  // const { agentId } = req.body;
  const mainAgentId = req.query.mainAgentId;

  // if (!date || !time) {
  //   return res.status(400).send({
  //     status: false,
  //     message: "Date and time are required.",
  //   });
  // }

  // Retrieve calendar integration for the main agent
  const calIntegration = await db.CalendarIntegration.findOne({
    where: { mainAgentId: mainAgentId },
  });

  if (!calIntegration) {
    return res.status(404).send({
      status: false,
      message: "Calendar integration not found.",
    });
  }

  try {
    // Query the calendar API for availability
    let data = await getAllSchedules(calIntegration.apiKey);
    console.log(data);
    // return;

    // const responseData = await response.json();

    if (data) {
      return res.send({
        status: true,
        message: "User Schedule",
        data: data,
      });
    } else {
      console.error("Error checking availability:", responseData);
      return res.status(response.status).send({
        status: false,
        message: "Failed to check availability.",
        data: responseData,
      });
    }
  } catch (error) {
    console.error("Error during availability check:", error.message);
    return res.status(500).send({
      status: false,
      message: "An error occurred while checking availability.",
      error: error.message,
    });
  }
}

function getParsedTime(time) {
  const timeFormats = [
    "HH:mm",
    "HH:mm:ss",
    "H:mm",
    "H:mm:ss",
    "hh:mm a",
    "hh:mm:ss a",
    "h:mm a",
    "h:mm:ss a",
    "hh:mmA",
    "hh:mm:ssA",
    "h:mmA",
    "h:mm:ssA",
    "hh:mm a",
    "hh:mm:ss a",
    "h:mm a",
    "h:mm:ss a",
    "HHmm",
    "HHmmss",
    "hhmm a",
    "hhmmss a",
    "hmm a",
    "hmmss a",
    "h:mm",
    "h:mm:ss",
    "H",
    "HH",
    "hh a",
    "h a",
  ];
  let parsedTime;
  for (let format of timeFormats) {
    parsedTime = parse(time, format, new Date());
    if (isValid(parsedTime)) break;
  }

  if (!isValid(parsedTime)) {
    return {
      status: false,
      message: "Invalid time format. Please provide a recognizable time.",
    };
  }
  return {
    status: true,
    message: "Parsed Time",
    data: parsedTime,
  };
}

function getParsedDate(date) {
  const dateFormats = [
    "yyyy-MM-dd",
    "MM-dd-yyyy",
    "MM-dd-yy",
    "dd-MM-yyyy",
    "dd-MM-yy",
    "MMM, dd yyyy",
    "MMM dd, yyyy",
    "MMMM dd, yyyy",
    "MMMM dd yyyy",
    "yyyy/MM/dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "MM/dd/yy",
    "dd/MM/yy",
    "dd MMM yyyy",
    "dd MMMM yyyy",
    "MMM dd yyyy",
    "MMMM d, yyyy",
    "d MMM yyyy",
    "d MMMM yyyy",
    "MMM d, yyyy",
    "MMM d yyyy",
    "MMMM d yyyy",
    "yyyy.MM.dd",
    "MM.dd.yyyy",
    "dd.MM.yyyy",
    "dd.MM.yy",
    "MM.dd.yy",
    "yyyy MMM dd",
    "yyyy MMMM dd",
    "EEE, MMM d, yyyy",
    "EEE, MMM dd, yyyy",
    "EEEE, MMMM d, yyyy",
    "EEEE, MMMM dd, yyyy",
    "d/M/yyyy",
    "M/d/yyyy",
    "M/d/yy",
    "dd-MMM-yyyy",
    "dd-MMMM-yyyy",
    "yyyyMMdd",
    "MMddyyyy",
    "ddMMyyyy",
    "yyMMdd",
    "dd MMM yyyy",
    "MMMM yyyy",
    "MMM yyyy",
    "yyyy",
    "yyyy-MM",
  ];

  // Parse the date
  let parsedDate;
  for (let format of dateFormats) {
    parsedDate = parse(date, format, new Date());
    if (isValid(parsedDate)) break;
  }

  if (!isValid(parsedDate)) {
    return {
      status: false,
      message: "Invalid date format. Please provide a recognizable date.",
    };
  }

  return { status: true, message: "Parsed", data: parsedDate };
}
export async function ScheduleEvent(req, res) {
  let { user_email, date, time } = req.body;
  console.log("Schedule meeting with date and time: ", {
    user_email,
    date,
    time,
  });

  let mainAgentId = req.query.mainAgentId;
  let modelId = req.query.modelId || null;
  if (!modelId) {
    return res.send({
      status: false,
      message: "No such model Id",
    });
  }

  // Check if a valid model | assistant
  let agent = await db.AgentModel.findOne({
    where: { id: modelId },
  });

  if (!agent) {
    return res.send({
      status: false,
      message: "Meeting cannot be scheduled",
      data: "Meeting cannot be scheduled",
    });
  }
  let mainAgent = await db.MainAgentModel.findOne({
    where: {
      id: mainAgentId,
    },
  });

  let user = await db.User.findByPk(mainAgent.userId);
  let calIntegration = await db.CalendarIntegration.findOne({
    where: { mainAgentId: mainAgent.id },
  });
  if (!calIntegration) {
    return res.send({
      status: false,
      message: "Meeting cannot be scheduled",
      data: "Meeting cannot be scheduled",
    });
  }

  // Define all possible date and time formats
  let parsedDate = getParsedDate(date).data;
  // Parse the time
  let parsedTime = getParsedTime(time).data;
  console.log(`Parsed Date: ${parsedDate} Time: ${parsedTime}`);
  if (!parsedDate || !parsedTime) {
    return res.send({
      status: false,
      message: "Invalid date time",
      data: { parsedDate, parsedTime },
    });
  }

  // Combine parsed date and time into a single Date object

  parsedDate.setHours(parsedTime.getHours(), parsedTime.getMinutes(), 0, 0);
  const startTimeISO = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

  // Consider the calendar is cal.com
  let apiKey = calIntegration.apiKey;
  let eventTypeId = Number(calIntegration.eventId); // Ensure this is a number

  let lead = await db.LeadModel.findOne({
    where: {
      email: user_email,
    },
  });
  let inputData = {
    start: startTimeISO, // Use combined ISO date-time string for the start time
    eventTypeId: eventTypeId,
    // lengthInMinutes: 30,
    attendee: {
      name: lead?.name || "Caller",
      email: user_email || "salman@e8-labs.com",
      timeZone: "America/New_York", // Ensure it's a valid IANA time-zone
      language: "en", // Ensure this is a string
    },
    // guests: [user.email], // Add any other guests here if needed
    // meetingUrl: "https://example.com/meeting",
    // location: "Zoom", // Specify location or meeting link
    bookingFieldsResponses: {
      customField: "customValue", // Include any custom fields if required
    },
    metadata: {}, // Ensure metadata is an object
  };

  console.log("Data sent to schedule ", JSON.stringify(inputData));
  try {
    const response = await fetch(`${CAL_API_URL}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13", // Update this if necessary
      },
      body: JSON.stringify(inputData),
    });

    const responseData = await response.json();
    if (response.ok) {
      console.log("Event scheduled successfully:", responseData);
      return res.send({
        status: true,
        message: "Event scheduled successfully",
        data: responseData,
      });
    } else {
      console.error("Error scheduling event:", JSON.stringify(responseData));
      return res.send({
        status: false,
        message: "Meeting cannot be scheduled",
        data: responseData,
      });
    }
  } catch (error) {
    console.error("Error scheduling event:", error.message);
    return res.send({
      status: false,
      message: "Meeting cannot be scheduled",
      data: "Meeting cannot be scheduled",
      error: error.message,
    });
  }
}

export async function AddCalendarCalDotCom(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findByPk(userId);
      let calendarType = req.body.calendarType || "cal_dot_com"; //cal_dot_com or ghl
      let apiKey = req.body.apiKey; // for calDotCom
      let eventId = req.body.eventId || null;
      let mainAgentId = req.body.mainAgentId;
      let mainAgent = await db.MainAgentModel.findByPk(mainAgentId);
      let title = req.body.title;
      try {
        // Fetch calendars
        let apiClient = getApiClient(apiKey);
        const calendarsResponse = await apiClient.get("/calendars");
        const calendars = calendarsResponse.data;

        console.log("Available Calendars:", calendars);

        // Fetch event types
        const eventTypesResponse = await apiClient.get("/event-types");
        const eventTypes = eventTypesResponse.data;
        let groups = eventTypes?.data?.eventTypeGroups || [];
        let eventId15Min = null;
        if (eventId) {
          eventId15Min = eventId;
        } else if (groups.length > 0) {
          // get some event id from cal dot com
          let actualEventTypes = groups[0].eventTypes || [];
          if (actualEventTypes.length > 0) {
            eventId15Min = actualEventTypes[0].id;
          }
        }
        let created = await db.CalendarIntegration.create({
          type: calendarType,
          apiKey: apiKey,
          userId: userId,
          eventId: eventId15Min,
          mainAgentId: mainAgentId,
          title: title,
        });

        console.log("Available Event Types:", eventTypes);

        //add action
        let actionResult = await CreateAndAttachCalendarAction(user, mainAgent);
        if (actionResult) {
          console.log("Action Create Result ", actionResult);
          let ids = actionResult.data;
          created.data = JSON.stringify(ids);
          await created.save();
        }
        // Return both calendars and event types
        return res.send({ status: true, calendars, eventTypes });
      } catch (error) {
        console.error("Error retrieving calendars or event types:", error);
        return res.send({
          status: false,
          message: error.message,
          error: error,
        });
      }
    }
  });
}

export async function GetUserConnectedCalendars(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findByPk(userId);
      const calendars = await db.CalendarIntegration.findAll({
        attributes: [
          "title",
          "apiKey",
          "eventId",
          [
            db.Sequelize.fn("MAX", db.Sequelize.col("createdAt")),
            "latestCreatedAt",
          ], // Example: Fetch the latest createdAt if needed
        ],
        where: {
          userId: userId,
        },
        group: ["apiKey", "eventId", "title"], // Group by unique apiKey and eventId
        order: [
          [db.Sequelize.fn("MAX", db.Sequelize.col("createdAt")), "DESC"],
        ], // Order by latest createdAt
      });
      // Return both calendars and event types
      return res.send({ status: true, data: calendars });
    } else {
      return res.send({
        status: false,
        data: null,
        message: "Unauthenticated user",
      });
    }
  });
}
