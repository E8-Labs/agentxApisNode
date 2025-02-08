import db from "../models/index.js";
import moment from "moment-timezone";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const LeadImportantCallResource = async (user, currentUser = null) => {
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
  // console.log("Type of user is ", typeof user);

  let leadTags = await db.LeadTagsModel.findAll({
    where: {
      leadId: lead.id,
    },
  });
  let stage = null;
  if (lead.stage) {
    stage = await db.PipelineStages.findByPk(lead.stage);
  }
  let tags = leadTags.map((tag) => tag.tag);

  let sheetTags = await db.LeadSheetTagModel.findAll({
    where: {
      sheetId: lead.sheetId,
    },
  });
  let sheetTagsArray = sheetTags.map((tag) => tag.tag);

  let leadData = null;
  try {
    leadData = lead.get();
  } catch (error) {
    leadData = lead;
  }

  let callActivity = await db.LeadCallsSent.findAll({
    where: {
      leadId: lead.id,
      call_review_worthy: true,
    },
    order: [["createdAt", "DESC"]],
  });
  let formattedCalls = [];
  if (callActivity && callActivity.length > 0) {
    for (let call of callActivity) {
      const minutes = Math.floor(call.duration / 60);
      const seconds = call.duration % 60;
      const formattedDuration = `${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
      let subAgentId = call.agentId;
      let agent = await db.AgentModel.findByPk(subAgentId);
      // callData.agent = agent;
      formattedCalls.push({
        ...call.dataValues, // Include existing call data
        durationFormatted: formattedDuration,
        agent: { name: agent.name, id: agent.id, type: agent.agentType },
      });
    }
  }

  // let scheduled = await db.ScheduledBooking.findOne({
  //   where: {
  //     leadId: lead.id,
  //   },
  //   order: [["createdAt", "DESC"]],
  // });
  let scheduledBookings = await fetchFutureBookings(lead);
  let scheduled = null;
  if (scheduledBookings && scheduledBookings.length > 0) {
    scheduled = scheduledBookings[0];
  }

  let emails = await db.LeadEmailModel.findAll({
    where: {
      leadId: lead.id,
      email: {
        [db.Sequelize.Op.notLike]: "%Not Provided%",
      },
    },
  });
  if (emails && emails.length > 0) {
    if (leadData.email == null || leadData.email == "") {
      leadData.email = emails[0].email;
      emails.pop(0);
    }
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
  const LeadResource = {
    ...leadData,
    tags: tags, //{ ...tags, ...sheetTagsArray },
    callActivity: formattedCalls,
    emails: emails,
    booking: scheduled,
    pipeline: pipeline,
    stage: stage,
  };

  return LeadResource;
}

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

    // console.log("Total bookings ", bookings?.length || 0);

    // console.log(
    //   "=======================================Bookings=======================================\n\n\n"
    // );
    // bookings.map((booking) => {
    //   console.log(booking.dataValues);
    // });
    // console.log(
    //   "=======================================Bookings=======================================\n\n\n"
    // );

    // Filter bookings based on timezone
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
        futureBookings.push(booking);
      }
    }

    // console.log("Future bookings ", futureBookings?.length || 0);
    return futureBookings;
  } catch (error) {
    console.error("Error fetching future bookings:", error);
    throw error;
  }
};

export default LeadImportantCallResource;
