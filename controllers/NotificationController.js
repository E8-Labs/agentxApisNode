import db from "../models/index.js";
import JWT from "jsonwebtoken";
import { DateTime } from "luxon";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import NotificationResource from "../resources/NotificationResource.js";

async function GetNotificationTitle(
  user,
  fromUser = null,
  type,
  lead = null,
  agent = null,
  code = null
) {
  let title = "";

  if (type == NotificationTypes.RedeemedAgentXCode) {
    title = `30 minutes added for using (${code})`;
  }
  if (type == NotificationTypes.Redeemed60Min) {
    title = `60 minutes added for aborting plan cancellation`;
  }
  if (type == NotificationTypes.InviteAccepted) {
    title = `${fromUser.name} accepted your invite`;
  }
  if (type == NotificationTypes.Hotlead) {
    title = `${lead.firstName} is a hotlead`;
  }
  if (type == NotificationTypes.TotalHotlead) {
    //calculate hotleads today.
    let hotleads = await db.LeadCallsSent.count({
      where: {
        agentId: agent.id,
        hotlead: true,
      },
    });
    title = `You have ${hotleads} hotleads today 🔥`;
  }

  if (type == NotificationTypes.MeetingBooked) {
    title = `${lead.firstName} booked a meeting`;
  }

  return title;
}
/**
 * Creates a notificaiton for the given details
 * @param {Object} user - The receiving user.
 * @param {Object} fromUser - The sending user.
 * @param {string} type - Type of notification.
 * @param {Object} lead - Lead  if any.
 * @param {Object} agent - Agent  if any.
 * @param {string} codeRedeemed - codeRedeemed .
 * @returns {Object} - PaymentIntent details or an error message.
 */
export const AddNotification = async (
  user,
  fromUser = null,
  type,
  lead = null,
  agent = null,
  code = null
) => {
  console.log("Data in add not ", { user, fromUser, type, lead, agent, code });
  try {
    let title = await GetNotificationTitle(
      user,
      fromUser,
      type,
      lead,
      agent,
      code
    );
    console.log("Not Title is ", title);
    let not = await db.NotificationModel.create({
      userId: user.id,
      fromUserId: fromUser?.id,
      title: title,
      type: type,
      leadId: lead?.id,
      agentId: agent?.id,
      codeRedeemed: code,
    });

    return not;
  } catch (error) {
    console.log("Error adding not ", error);
    return null;
  }
};

export const GetNotifications = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      const limit = 50;
      let offset = Number(req.query.offset) || 0;
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let nots = await db.NotificationModel.findAll({
        where: {
          userId: user.id,
        },
        offset: offset,
        limit: limit,
      });

      let unread = await db.NotificationModel.count({
        where: {
          isSeen: false,
          userId: user.id,
        },
      });

      res.send({
        status: true,
        message: `Notifications list`,
        data: {
          notifications: await NotificationResource(nots),
          unread: unread,
        },
      });
    } else {
      res.send({
        status: false,
        message: "Unauthenticated user",
      });
    }
  });
};

export const NotificationCron = async () => {
  let date = new Date().toISOString();
  console.log("Current time server ", date);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0); // Set to start of day

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999); // Set to end of day

  let notSent = await db.DailyNotificationModel.findAll({
    where: {
      createdAt: {
        [Op.gte]: startOfToday, // Greater than or equal to the start of the day
        [Op.lt]: endOfToday, // Less than the end of the day
      },
    },
  });

  let userIds = [];
  if (notSent && notSent.length > 0) {
    userIds = notSent.map((not) => not.userId);
  }

  let users = await db.User.findAll({
    where: {
      userId: {
        [db.Sequelize.Op.notIn]: userIds,
      },
    },
  });

  for (const u of users) {
    let timeZone = u.timeZone || "America/Los_Angeles";
    console.log("User Time zone is ", timeZone);
    if (timeZone) {
      let timeInUserTimeZone = convertUTCToTimezone(date, timeZone);
      console.log("TIme in user timezone", timeInUserTimeZone);
      const userDateTime = DateTime.fromFormat(
        timeInUserTimeZone,
        "yyyy-MM-dd HH:mm:ss",
        { zone: timeZone }
      );
      const ninePM = userDateTime.set({ hour: 21, minute: 0, second: 0 });

      if (userDateTime > ninePM) {
        console.log(
          `It's after 9 PM in ${timeZone}. Current time: ${timeInUserTimeZone}`
        );
        //send notification
        SendNotificationsForHotlead(u);
      } else {
        console.log(
          `It's not yet 9 PM in ${timeZone}. Current time: ${timeInUserTimeZone}`
        );
      }
    }
  }
};

async function SendNotificationsForHotlead(user) {
  try {
    let agentsAssignedToCadence = await db.PipelineCadence.findAll();
    let mainAgentIds = [];
    if (agentsAssignedToCadence && agentsAssignedToCadence.length > 0) {
      mainAgentIds = agentsAssignedToCadence.map((agent) => agent.mainAgentId);
    }

    console.log("Assigned agents ", mainAgentIds);
    // let ids = [];
    let agents = await db.AgentModel.findAll({
      where: {
        userId: user.id,
        mainAgentId: {
          [db.Sequelize.Op.in]: mainAgentIds,
        },
      },
    });
    console.log("Total subaagents ", agents?.length);
    await db.DailyNotificationModel.create({
      userId: u.id,
    });
    for (const agent of agents) {
      let hotleads = await db.LeadCallsSent.count({
        where: {
          agentId: agent.id,
          hotlead: true,
        },
      });
      if (hotleads > 0) {
        await AddNotification(
          u,
          null,
          NotificationTypes.TotalHotlead,
          null,
          agent,
          null
        );
      } else {
        console.log("Hotleads are less than 1");
      }
    }
  } catch (error) {
    console.log("Error adding not ");
  }
}
