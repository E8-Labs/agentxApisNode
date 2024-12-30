import JWT from "jsonwebtoken";
import db from "../models/index.js";
import axios from "axios";
import GHL from "../utils/ghl.js";
import { toZonedTime, formatInTimeZone, toDate } from "date-fns-tz";

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

import { DateTime } from "luxon";
import { AddNotification } from "./NotificationController.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";

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

  // if (!date || !time) {
  //   return res.status(400).send({
  //     status: false,
  //     message: "Date and time are required.",
  //   });
  // }

  // Retrieve calendar integration for the main agent
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

  try {
    // Query the calendar API for availability
    let data = await fetchAvailableSlotsForNext15Days(
      calIntegration.apiKey,
      calIntegration.eventId,
      calIntegration.timeZone
    );
    console.log(data);
    // let formatted = "";
    // if (data) {
    //   formatted = formatAvailableSlots(data);
    // }
    // return;

    // const responseData = await response.json();

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
        // originalUTC: slot.time,
        localTime: localDateTime.toISO(),
      });
    });
  });

  return convertedSlots;
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
  let { user_email, date, time, lead_name, lead_phone } = req.body;
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

  let filter = { mainAgentId: mainAgentId };
  if (agent) {
    filter.agentId = agent.id;
  }
  let calIntegration = await db.CalendarIntegration.findOne({
    where: filter,
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
  console.log(`Parsed Date: ${parsedDate} `);
  const startTimeISO = format(parsedDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const pacificTime = convertToPacificTime(startTimeISO);

  console.log("Pacific Time:", pacificTime);

  const localDateTime = DateTime.fromFormat(
    `${date} ${time}`,
    "yyyy-MM-dd HH:mm",
    {
      zone: calIntegration.timeZone,
    }
  );

  // Convert to UTC
  const utcDateTime = localDateTime.toUTC();

  console.log("Local Time:", localDateTime.toString()); // Pacific Time
  console.log("UTC Time:", utcDateTime.toString()); // UTC Time
  // return;
  // Consider the calendar is cal.com
  let apiKey = calIntegration.apiKey;
  let eventTypeId = Number(calIntegration.eventId); // Ensure this is a number

  let lead = await db.LeadModel.findOne({
    where: {
      phone: lead_phone,
      userId: user.id,
    },
  });
  if (!lead) {
    lead = await db.LeadModel.findOne({
      where: {
        email: user_email,
        userId: user.id,
      },
    });
  }
  let inputData = {
    start: utcDateTime.toISO(), // Use combined ISO date-time string for the start time
    eventTypeId: eventTypeId,
    // lengthInMinutes: 30,
    attendee: {
      name: lead?.name || lead_name || "Caller",
      email: user_email || "salman@e8-labs.com",
      timeZone: calIntegration.timeZone, // Ensure it's a valid IANA time-zone
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

      await AddNotification(
        user,
        null,
        NotificationTypes.MeetingBooked,
        lead,
        agent,
        null
      );
      if (lead) {
        console.log("Lead was found so creating event");
        await db.ScheduledBooking.create({
          leadId: lead.id,
          mainAgentId: mainAgentId,
          agentId: agent.id,
          data: JSON.stringify(responseData),
          datetime: startTimeISO,
          date: date,
          time: time,
        });
      }
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
          "timeZone",
          [
            db.Sequelize.fn("MAX", db.Sequelize.col("createdAt")),
            "latestCreatedAt",
          ], // Example: Fetch the latest createdAt if needed
        ],
        where: {
          userId: userId,
        },
        group: ["apiKey", "eventId", "title", "timeZone"], // Group by unique apiKey and eventId
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
