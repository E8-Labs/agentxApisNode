import db from "../models/index.js";
import LeadEmailModel from "../models/lead/LeadEmails.js";
// import {
//   getTotalYapScore,
//   getTotalReviews,
//   getTotalSpent,
// } from "../utils/user.utility.js";
// import AssistantLiteResource from "./assistantliteresource.js";
// import UserSubscriptionResource from "./usersubscription.resource.js";
// import { getSubscriptionDetails } from "../services/subscriptionService.js";

const Op = db.Sequelize.Op;

const LeadResource = async (user, currentUser = null) => {
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

async function getLatestAndUniqueKycs(leadId) {
  // Find the latest `callId` for the given `leadId`
  const latestCallId = await db.LeadKycsExtracted.max("callId", {
    where: { leadId },
  });

  if (!latestCallId) {
    return []; // No data available for the given `leadId`
  }

  // Fetch KYCs for the latest `callId`
  const latestCallKycs = await db.LeadKycsExtracted.findAll({
    where: {
      leadId,
      callId: latestCallId,
    },
  });

  // Fetch all KYCs for the `leadId`
  const allKycs = await db.LeadKycsExtracted.findAll({
    where: { leadId },
    order: [["updatedAt", "DESC"]], // Ensure the latest entries come first
  });

  // Deduplicate KYCs by `question`, keeping the latest entry
  const uniqueKycsMap = new Map();
  allKycs.forEach((kyc) => {
    if (
      !uniqueKycsMap.has(kyc.question) &&
      !kyc.question.includes(process.env.StagePrefix)
    ) {
      uniqueKycsMap.set(kyc.question, kyc);
    }
  });

  // Extract unique KYCs from the map
  const uniqueKycs = Array.from(uniqueKycsMap.values());

  return uniqueKycs;
}

async function getUserData(lead, currentUser = null) {
  // console.log("Type of user is ", lead);
  //   let totalYapScore = 0;
  //   let reviews = 0;
  //   if (user instanceof db.User) {
  //     totalYapScore = await getTotalYapScore(user);
  //     reviews = await getTotalReviews(user);
  //   }

  //   const subscriptionDetails = await getSubscriptionDetails(user);

  let leadTags = await db.LeadTagsModel.findAll({
    where: {
      leadId: lead.id,
    },
  });
  let tags = leadTags.map((tag) => capitalize(tag.tag));

  let sheetTags = await db.LeadSheetTagModel.findAll({
    where: {
      sheetId: lead.sheetId,
    },
  });
  // if (sheetTags && sheetTags.length > 0) {
  //   let sheetTagsArray = sheetTags.map((tag) => tag.tag);
  //   for (let t of sheetTagsArray) {
  //     tags.push(t);
  //   }
  // }

  let kycs = await getLatestAndUniqueKycs(lead.id); //await db.LeadKycsExtracted.findAll({
  //   where: {
  //     leadId: lead.id,
  //   },
  // });
  let leadData = null;
  try {
    leadData = lead.get();
  } catch (error) {
    leadData = lead;
  }

  let notes = await db.LeadNotesModel.findAll({
    where: {
      leadId: lead.id,
    },
  });

  let callActivity = await db.LeadCallsSent.findAll({
    where: {
      leadId: lead.id,
    },
    order: [["createdAt", "DESC"]],
  });
  let formattedCalls = [];
  if (callActivity && callActivity.length > 0) {
    formattedCalls = callActivity.map((call) => {
      const minutes = Math.floor(call.duration / 60);
      const seconds = call.duration % 60;
      const formattedDuration = `${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;

      return {
        ...call.dataValues, // Include existing call data
        durationFormatted: formattedDuration,
      };
    });
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
        [db.Sequelize.Op.ne]: lead.email,
      },
    },
  });
  if (emails && emails.length > 0) {
    if (leadData.email == null || leadData.email == "") {
      leadData.email = emails[0].email;
      let newEmails = [];
      emails.map((item, index) => {
        if (index > 0) {
          newEmails.push(item);
        }
      });
      emails = newEmails;
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

  let dncData = leadData.dncData;
  let cell = null;
  let isOnDncList = false;
  if (dncData) {
    try {
      dncData = JSON.stringify(dncData);

      const code = dncData.RESPONSECODE;

      if (code !== "OK") {
        isOnDncList =
          dncData.national_dnc === "Y" ||
          dncData.state_dnc === "Y" ||
          dncData.dma === "Y" ||
          dncData.litigator === "Y";
        if (dncData.iscell == "Y") {
          cell = "Cellphone";
        } else if (dncData.iscell == "N") {
          cell = "Landline";
        } else {
          cell = "VOIP";
        }
      } else {
        // ✅ 4. Check if lead is on any DNC list
        if (code == "-1" || code == "invalid-phone") {
          console.log("DNC CHECK: Invalid phone number");
        }
      }
    } catch (error) {}
  }

  const LeadResource = {
    ...leadData,
    tags: tags, //{ ...tags, ...sheetTagsArray },
    kycs: kycs,
    notes: notes,
    callActivity: formattedCalls,
    emails: emails,
    booking: scheduled,
    pipeline: pipeline,
    teamsAssigned: teamsAssigned,
    cell: cell,
    isOnDncList: isOnDncList,
    // sheetTagsArray,
  };

  return LeadResource;
}

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
        booking.time = convertTimeFormat(booking.time);

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

export default LeadResource;
