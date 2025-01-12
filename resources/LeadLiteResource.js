import db from "../models/index.js";
// import LeadEmailModel from "../models/lead/LeadEmails.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

import moment from "moment-timezone";
import { capitalize } from "../utils/StringUtility.js";

const convertTimeFormat = (timeString) => {
  console.log("TIme to be converted is ", timeString);
  let time = moment(timeString, "HH:mm").format("h:mm A");
  console.log("TIme converted is ", time);
  return time;
};

const fetchFutureBookings = async (lead) => {
  try {
    // Get the current datetime in UTC
    const now = moment.utc();

    // Fetch all bookings
    const bookings = await db.ScheduledBooking.findAll({
      where: {
        leadId: lead.id,
      },
    });

    console.log("Total bookings ", bookings?.length || 0);

    const futureBookings = [];

    for (const booking of bookings) {
      const { agentId, datetime } = booking;

      // Fetch the calendar for the agent
      const calendar = await db.CalendarIntegration.findOne({
        where: { agentId },
      });

      if (!calendar) {
        console.warn(`Calendar not found for agentId: ${agentId}`);
        continue;
      }

      const { timeZone } = calendar;

      // Convert booking datetime to the calendar's timezone
      const bookingDate = moment.utc(datetime); // Interpret datetime as UTC
      const zonedDate = bookingDate.tz(timeZone); // Convert to the agent's timezone

      // Check if the booking is in the future
      if (zonedDate.isAfter(now)) {
        booking.timeZone = timeZone;
        booking.zonedDate = zonedDate.format();
        booking.time = convertTimeFormat(booking.time);
        futureBookings.push(booking);
      }
    }

    console.log("Future bookings ", futureBookings?.length || 0);
    return futureBookings;
  } catch (error) {
    console.error("Error fetching future bookings:", error);
    throw error;
  }
};

const LeadLiteResource = async (user, currentUser = null) => {
  if (!Array.isArray(user)) {
    ////////console.log("Not array")
    return await getUserData(user, currentUser);
  } else {
    ////////console.log("Is array")
    const data = [];
    for (let i = 0; i < user.length; i++) {
      const p = await getUserData(user[i], currentUser);
      ////////console.log("Adding to index " + i)
      data.push(p);
    }

    return data;
  }
};

async function getUserData(lead, currentUser = null) {
  console.log("Type of user is ", lead);

  let leadTags = await db.LeadTagsModel.findAll({
    where: {
      leadId: lead.id,
    },
  });
  let tags = leadTags.map((tag) => capitalize(tag.tag));

  let leadData = null;
  try {
    leadData = lead.get();
  } catch (error) {
    leadData = lead;
  }

  let scheduledBookings = await fetchFutureBookings(lead);
  let scheduled = null;
  if (scheduledBookings && scheduledBookings.length > 0) {
    scheduled = scheduledBookings[0];
  }

  let cad = await db.LeadCadence.findOne({
    where: {
      leadId: lead.id,
    },

    order: [["createdAt", "DESC"]],
  });
  let pipeline = null;
  if (cad) {
    pipeline = await db.Pipeline.findByPk(cad.pipelineId);
  }

  let teamsAssigned = [];
  let teams = await db.TeamLeadAssignModel.findAll({
    where: {
      leadId: leadData.id,
    },
  });
  if (teams && teams.length > 0) {
    for (const t of teams) {
      let user = await db.User.findByPk(t.userId);
      teamsAssigned.push(user);
    }
  }

  delete leadData.status;
  const { id, firstName, lastName, address, email, phone, stage } = leadData;
  const LeadResource = {
    id,
    firstName,
    lastName,
    address,
    email,
    phone,
    stage,
    tags: tags,
    booking: scheduled,
    pipeline: pipeline,
    teamsAssigned: teamsAssigned,
    // sheetTagsArray,
  };

  return LeadResource;
}

export default LeadLiteResource;
