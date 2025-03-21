import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import GHL from "../utils/ghl.js";
import { toZonedTime, formatInTimeZone, toDate } from "date-fns-tz";

import {
  AttachActionToModel,
  CreateAndAttachCalendarAction,
} from "./actionController.js";
import {
  DeleteActionSynthflow,
  getInboudPromptText,
  UpdateAssistantSynthflow,
} from "./synthflowController.js";
import {
  CreateAndAttachAction,
  CreateAndAttachInfoExtractor,
} from "./actionController.js";

import { parse, isValid, format } from "date-fns";

import { DateTime } from "luxon";
import { AddNotification } from "./NotificationController.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import { GetTeamAdminFor, GetTeamIds } from "../utils/auth.js";
import { WriteToFile } from "../services/FileService.js";

// Define possible date and time formats
const dateFormats = [
  "yyyy-MM-dd",
  "MM-dd-yyyy",
  "dd-MM-yyyy",
  "yyyy/MM/dd",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "yyyy.MM.dd",
  "MM.dd.yyyy",
  "dd.MM.yyyy",
  "d MMM yyyy",
  "d MMMM yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "yyyyMMdd",
];

const timeFormats = [
  "HH:mm",
  "HH:mm:ss",
  "h:mm a",
  "h:mm:ss a",
  "hh:mm a",
  "hh:mm:ss a",
  "H:mm",
  "H:mm:ss",
];

const convertToPacificTime = (isoString) => {
  // Parse the ISO string with the original timezone offset
  const dateTime = DateTime.fromISO(isoString, { setZone: true });

  // Convert to the Pacific Time Zone (America/Los_Angeles)
  const pacificTime = dateTime.setZone("America/Los_Angeles");

  // Format the result as an ISO string
  return pacificTime.toISO();
};

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

export async function CheckCalendarAvailability(req, res) {
  // const { agentId } = req.body;
  const mainAgentId = req.query.mainAgentId;
  const agentId = req.query.agentId || null;
  console.log("Data is ");
  console.log({ agentId, mainAgentId });
  let filter = { mainAgentId: mainAgentId };
  if (agentId) {
    filter.agentId = agentId;
  }
  const calIntegration = await db.CalendarIntegration.findOne({
    where: filter,
  });

  if (!calIntegration) {
    return res.status(404).send({
      status: false,
      message: "Calendar integration not found.",
    });
  }

  let currentDate = new Date();

  try {
    // Query the calendar API for availability
    let data = await fetchAvailableSlotsForNext15Days(
      calIntegration.apiKey,
      calIntegration.eventId,
      calIntegration.timeZone
    );
    // console.log(data);
    // let formatted = "";
    // if (data) {
    //   formatted = formatAvailableSlots(data);
    // }
    // return;

    // const responseData = await response.json();
    data.currentDate = currentDate;

    if (data) {
      return res.send({
        status: true,
        message: "User Schedule",
        data: data,
      });
    } else {
      console.error("Error checking availability:", data);
      return res.status(200).send({
        status: false,
        message: "Failed to check availability.",
        data: data,
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

const fetchAvailableSlotsForNext15Days = async (
  apiKey,
  eventTypeId,
  timeZone
) => {
  const today = new Date();
  const startTime = today.toISOString(); // Today's date in ISO format

  // Add 15 days to today's date
  const endTime = new Date(today);
  endTime.setDate(today.getDate() + 15);

  try {
    const response = await axios.get("https://api.cal.com/v2/slots/available", {
      headers: {
        Authorization: "Bearer " + apiKey,
      },
      params: {
        startTime: startTime, // Start today
        endTime: endTime.toISOString(), // End 15 days from today
        eventTypeId: eventTypeId, // Replace with your actual eventTypeId
        timeZone: timeZone,
      },
    });
    const data = await response.data.data;
    // console.log(JSON.stringify(data));
    // Convert each slot to the desired time zone
    const convertedSlots = await processSlots(response, timeZone);
    console.log("Slots in Converted ", convertedSlots);
    return { data: { slots: convertedSlots } }; //}response.data;
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    return null;
  }
};

async function processSlots(response, timeZone) {
  const data = response.data.data;
  console.log(JSON.stringify(data));

  // Initialize an array to store converted slots
  const convertedSlots = [];

  // Iterate over each date in the `slots` object
  Object.keys(data.slots).forEach((dateKey) => {
    const slotsForDate = data.slots[dateKey];

    // Process each slot in the array for the current date
    slotsForDate.forEach((slot) => {
      const utcDateTime = DateTime.fromISO(slot.time, { zone: "utc" });
      const localDateTime = utcDateTime.setZone(timeZone);

      // Add the converted slot to the result array
      convertedSlots.push({
        originalUTC: slot.time,
        localTime: localDateTime.toISO(),
      });
    });
  });

  return convertedSlots;
}

// import { DateTime } from "luxon";

// Function to handle any input format and intelligently parse it
// Helper function to parse flexible date with custom formats and time zone
function parseFlexibleDate(input, timeZone = "America/Los_Angeles") {
  const cleanedInput = input.trim();

  // First, attempt to parse using ISO 8601
  let parsedDate = DateTime.fromISO(cleanedInput, { zone: timeZone });

  if (parsedDate.isValid) {
    return {
      status: true,
      message: "Parsed successfully as ISO 8601",
      formattedDate: parsedDate,
    };
  }

  // Define common formats to try
  const possibleFormats = [
    "yyyy-MM-dd",
    "dd-MM-yyyy",
    "MM-dd-yyyy",
    "yyyy/MM/dd",
    "dd/MM/yyyy",
    "MM/dd/yyyy",
    "yyyy.MM.dd",
    "dd.MM.yyyy",
    "MM.dd.yyyy",
    "yyyyMMdd",
    "MMddyyyy",
    "ddMMyyyy",
  ];

  for (let format of possibleFormats) {
    parsedDate = DateTime.fromFormat(cleanedInput, format, { zone: timeZone });
    if (parsedDate.isValid) {
      return {
        status: true,
        message: `Parsed successfully using format: ${format}`,
        formattedDate: parsedDate,
      };
    }
  }

  // Handle swapped day and month intelligently
  const components = cleanedInput.split(/[-/.\s]/).map(Number);
  if (components.length === 3) {
    const [year, month, day] = components;
    if (month > 12 && day <= 12) {
      parsedDate = DateTime.fromObject(
        { year, month: day, day: month },
        { zone: timeZone }
      );
      if (parsedDate.isValid) {
        return {
          status: true,
          message: "Parsed by swapping day and month positions",
          formattedDate: parsedDate,
        };
      }
    }
  }

  // Parsing failed
  return {
    status: false,
    message:
      "Failed to parse the provided date. Please check the input format.",
    formattedDate: null,
  };
}

// Function to parse time with common formats
function parseTime(time) {
  const timeFormats = [
    "HH:mm",
    "HH:mm:ss",
    "hh:mm a",
    "hh:mm:ss a",
    "h:mm a",
    "h:mm:ss a",
  ];
  for (const format of timeFormats) {
    const parsed = DateTime.fromFormat(time, format);
    if (parsed.isValid) {
      return parsed;
    }
  }
  return null;
}

// Combine date and time into a single DateTime object
function combineDateAndTime(date, time, timeZone = "America/Los_Angeles") {
  const parsedDate = parseFlexibleDate(date, timeZone);
  if (!parsedDate.status) {
    console.warn("Invalid date:", parsedDate.message);
    return null;
  }

  const parsedTime = parseTime(time);
  if (!parsedTime) {
    console.warn("Invalid time format:", time);
    return null;
  }

  const combined = parsedDate.formattedDate.set({
    hour: parsedTime.hour,
    minute: parsedTime.minute,
    second: parsedTime.second,
  });

  if (combined.isValid) {
    return combined;
  }

  console.warn("Failed to combine date and time:", date, time);
  return null;
}

// Schedule Event Function
export async function ScheduleEvent(req, res) {
  WriteToFile(
    "------------------------------Scheduling Event Start-------------------------------"
  );

  const {
    user_email,
    date,
    time,
    lead_name,
    lead_phone,
    currentDate,
    aiTimezone,
    calendarTimezone,
  } = req.body;
  WriteToFile("Schedule meeting with date and time:");
  WriteToFile(
    JSON.stringify({
      user_email,
      date,
      time,
      lead_name,
      lead_phone,
      currentDate,
      aiTimezone,
      calendarTimezone,
    })
  );

  const mainAgentId = req.query.mainAgentId;
  const modelId = req.query.modelId || null;

  if (!modelId) {
    return res.send({ status: false, message: "No such model Id" });
  }

  const agent = await db.AgentModel.findOne({ where: { id: modelId } });
  if (!agent) {
    return res.send({
      status: false,
      message: "Meeting cannot be scheduled: NO Agent",
    });
  }

  const mainAgent = await db.MainAgentModel.findOne({
    where: { id: mainAgentId },
  });
  let lead = null;
  lead = await db.LeadModel.findOne({
    where: {
      email: user_email,
      userId: mainAgent.userId,
      status: "active",
    },
  });
  if (!lead && lead_phone) {
    lead = await db.LeadModel.findOne({
      where: {
        phone: lead_phone,
        userId: mainAgent.userId,
        status: "active",
      },
    });
  }
  const user = await db.User.findByPk(mainAgent.userId);
  const admin = await GetTeamAdminFor(user);
  const teamIds = await GetTeamIds(user);
  const calIntegration = await db.CalendarIntegration.findOne({
    where: { mainAgentId, agentId: agent.id },
  });

  if (!calIntegration) {
    return res.send({
      status: false,
      message: "Meeting cannot be scheduled: NO Calendar",
    });
  }

  const result = combineDateAndTime(
    date,
    time,
    calIntegration.timeZone || "America/Los_Angeles"
  );
  if (!result) {
    return res.send({ status: false, message: "Invalid date or time format" });
  }

  const combinedDateTime = result;
  WriteToFile(`Combined Date Time: ${combinedDateTime.toISO()}`);

  const pacificTime = combinedDateTime.setZone(calIntegration.timeZone);
  const utcTime = combinedDateTime.toUTC();
  WriteToFile(`Pacific Time: ${pacificTime}`);
  WriteToFile(`UTC Time: ${utcTime}`);

  const inputData = {
    start: utcTime.toISO(),
    eventTypeId: Number(calIntegration.eventId) || 0,
    attendee: {
      name: lead_name || "Caller",
      email: user_email,
      timeZone: calIntegration.timeZone,
      language: "en",
    },
    metadata: {},
  };

  WriteToFile(JSON.stringify(inputData));
  try {
    const response = await fetch(`${CAL_API_URL}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${calIntegration.apiKey}`,
        "Content-Type": "application/json",
        "cal-api-version": "2024-08-13", // Update this if necessary
      },
      body: JSON.stringify(inputData),
    });

    const responseData = await response.json();
    if (response.ok) {
      WriteToFile(
        `Event scheduled successfully: ${JSON.stringify(responseData)}`
      );
      let meetingId = null;
      try {
        if (responseData.data.id) {
          meetingId = responseData.data.id;
        }
      } catch (error) {
        console.log("Error finding meeting id in schedule");
      }
      console.log("Meeting id is ", meetingId);
      // if (lead) {
      WriteToFile("Lead was found so creating event", meetingId);
      await db.ScheduledBooking.create({
        leadId: lead?.id,
        mainAgentId: mainAgentId,
        agentId: agent.id,
        data: JSON.stringify(responseData),
        datetime: utcTime.toISO(), //utcDateTime.toISO(),
        date: date,
        time: time,
        meetingId: meetingId,
      });
      // } else {
      //   WriteToFile("CalendarController: No lead found for adding a booking");
      // }
      let agentIds = [];
      let agents = await db.MainAgentModel.findAll({
        where: {
          userId: user.id,
        },
      });
      if (agents && agents.length > 0) {
        agentIds = agents?.map((item) => item.id) || [];
      }

      // let totalSchedules = await db.ScheduledBooking.count({
      //   where: {
      //     mainAgentId: {
      //       [db.Sequelize.Op.in]: agentIds,
      //     },
      //   },
      // });
      // if (totalSchedules == 1) {
      //   AddNotification(user, null, NotificationTypes.FirstAppointment);
      // }
      // if (totalSchedules == 3) {
      //   AddNotification(user, null, NotificationTypes.ThreeAppointments);
      // }
      // if (totalSchedules == 7) {
      //   AddNotification(user, null, NotificationTypes.SevenAppointments);
      // }
      // await AddNotification(
      //   user,
      //   null,
      //   NotificationTypes.MeetingBooked,
      //   lead,
      //   agent,
      //   null,
      //   null,
      //   pacificTime
      // );
      return res.send({
        status: true,
        message: "Event scheduled successfully",
        data: responseData,
      });
    } else {
      WriteToFile(`Error scheduling event: ${JSON.stringify(responseData)}`);
      return res.send({
        status: false,
        message: "Meeting cannot be scheduled",
        data: responseData,
      });
    }
  } catch (error) {
    console.log("Error", error);
    WriteToFile(`Error scheduling event: ${error.message}`);
    return res.send({
      status: false,
      message: "Meeting cannot be scheduled",
      error: error.message,
    });
  }
}

async function updatePromptForInbound(agent, user) {
  let prompt = await db.AgentPromptModel.findOne({
    where: {
      mainAgentId: agent.mainAgentId,
      type: "inbound",
    },
  });
  if (agent.agentType == "inbound") {
    console.log("This is an inbound agent so updating prompt");
    let inboundPromptText = await getInboudPromptText(prompt, agent, user);
    let updatedSynthflow = await UpdateAssistantSynthflow(agent, {
      agent: {
        prompt: inboundPromptText,
      },
    });
    //update to synthflow & also update in update agent api
  }
}
export async function AddCalendarCalDotCom(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findByPk(userId);
      let calendarType = req.body.calendarType || "cal_dot_com"; //cal_dot_com or ghl
      let apiKey = req.body.apiKey; // for calDotCom
      let timeZone = req.body.timeZone; // for calDotCom
      let eventId = req.body.eventId || null;
      let mainAgentId = req.body.mainAgentId;
      let agentId = req.body.agentId || null;
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
        if (!eventId15Min) {
          return res.send({
            status: true,
            message: "No event ids found",
            data: null,
          });
        }

        //check if there is already a calendar for this agent
        let filter = { mainAgentId: mainAgentId };
        if (agentId) {
          filter.agentId = agentId;
        }
        let cal = await db.CalendarIntegration.findOne({
          where: filter,
        });
        if (cal) {
          cal.eventId = eventId;
          cal.apiKey = apiKey;
          cal.timeZone = timeZone;
          cal.title = title;
          await cal.save();

          return res.send({
            status: true,
            message: "Calendar updated",
            data: cal,
            calendars,
            eventTypes,
          });
        }

        let calendar = null;
        if (agentId) {
          let created = await db.CalendarIntegration.create({
            type: calendarType,
            apiKey: apiKey,
            userId: userId,
            eventId: eventId15Min,
            mainAgentId: mainAgentId,
            title: title,
            agentId: agentId,
            timeZone: timeZone,
          });
          calendar = created;
          //add action
          let actionResult = await CreateAndAttachCalendarAction(
            user,
            mainAgent,
            agentId
          );
          let agent = await db.AgentModel.findByPk(agentId);
          if (agent.agentType == "inbound") {
            console.log("This is an inbound agent so updating prompt");
            await updatePromptForInbound(agent, user);
            //update to synthflow & also update in update agent api
          }
          if (actionResult) {
            console.log("Action Create Result ", actionResult);
            let ids = actionResult.data;
            created.data = JSON.stringify(ids);
            await created.save();
          }
        } else {
          let agents = await db.AgentModel.findAll({
            where: {
              mainAgentId: mainAgentId,
            },
          });
          if (agents && agents.length > 0) {
            console.log("Both agents");
            for (const agent of agents) {
              let created = await db.CalendarIntegration.create({
                type: calendarType,
                apiKey: apiKey,
                userId: userId,
                eventId: eventId15Min,
                mainAgentId: mainAgentId,
                title: title,
                agentId: agent.id,
                timeZone: timeZone,
              });
              calendar = created;

              //add action
              let actionResult = await CreateAndAttachCalendarAction(
                user,
                mainAgent,
                agent.id
              );
              // let agent = await db.AgentModel.findByPk(agentId);
              if (agent.agentType == "inbound") {
                console.log("Updating prompt for inbound");
                console.log("This is an inbound agent so updating prompt");
                await updatePromptForInbound(agent, user);
                //update to synthflow & also update in update agent api
              }
              if (actionResult) {
                console.log("Action Create Result ", actionResult);
                let ids = actionResult.data;
                created.data = JSON.stringify(ids);
                await created.save();
              }
            }
          }
        }

        console.log("Available Event Types:", eventTypes);

        // Return both calendars and event types
        return res.send({
          status: true,
          data: calendar,
          calendars,
          eventTypes,
        });
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

export async function DeleteCalendarApi(req, res) {
  let calendarId = req.body.calendarId;
  let calendar = await db.CalendarIntegration.findByPk(calendarId);
  if (!calendar) {
    return res.send({ status: false, message: "No such calendar" });
  }
  let data = calendar.data || null;
  console.log("Calendar", calendarId);
  if (data) {
    try {
      let actions = JSON.stringify(data);
      console.log("Total actions ", actions.length);
      if (actions && actions.length > 0) {
        for (let action of actions) {
          let del = DeleteActionSynthflow(action);
        }
      }
      console.log("Del cal from db");
      calendar.destroy();
      return res.send({ status: true, message: "Calendar deleted" });
    } catch (error) {
      console.log("Error deleting calendar", error);
      return res.send({ status: false, message: "Error deleting calendar" });
    }
  } else {
    calendar.destroy();
    return res.send({ status: true, message: "Calendar deleted" });
  }
}

export async function GetUserConnectedCalendars(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      let user = await db.User.findByPk(userId);
      let admin = await GetTeamAdminFor(user);
      let teamIds = await GetTeamIds(user);
      const calendars = await db.CalendarIntegration.findAll({
        attributes: [
          "id",
          "title",
          "apiKey",
          "eventId",
          "timeZone",
          [
            db.Sequelize.fn("MAX", db.Sequelize.col("createdAt")),
            "latestCreatedAt",
          ], // Example: Fetch the latest createdAt if needed
        ],
        where: {
          userId: {
            [db.Sequelize.Op.in]: teamIds,
          },
        },
        group: ["id", "apiKey", "eventId", "title", "timeZone"], // Group by unique apiKey and eventId
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

//with api key
export async function GetCalendarSchedule(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      try {
        let apiKey = req.body.apiKey;
        let userId = authData.user.id;
        let user = await db.User.findByPk(userId);

        if (!apiKey) {
          return res.status(400).send({
            status: false,
            message: "API key is required.",
          });
        }

        // Make the API call to Cal.com to get schedules
        const response = await fetch("https://cal.com/api/v2/schedules", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "cal-api-version": "2024-06-11",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          return res.status(response.status).send({
            status: false,
            message: "Failed to fetch schedules from Cal.com.",
            error: errorData,
          });
        }

        const data = await response.json();

        // Return schedules
        return res.send({
          status: true,
          data: data,
        });
      } catch (err) {
        console.error("Error fetching schedules:", err);
        return res.status(500).send({
          status: false,
          message: "Internal server error.",
          error: err.message,
        });
      }
    } else {
      return res.send({
        status: false,
        data: null,
        message: "Unauthenticated user",
      });
    }
  });
}

export async function DeleteCalendar(calendar) {
  let data = calendar.data || null;
  console.log("Calendar", calendar);
  if (data) {
    try {
      let actions = JSON.stringify(data);
      console.log("Total actions ", actions.length);
      if (actions && actions.length > 0) {
        for (let action of actions) {
          let del = DeleteActionSynthflow(action);
        }
      }
      console.log("Del cal from db");
      calendar.destroy();
      return true;
    } catch (error) {
      console.log("Error deleting calendar");
      return false;
    }
  } else {
    return true;
  }
}
