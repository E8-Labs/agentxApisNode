import db from "../models/index.js";
import JWT from "jsonwebtoken";
import { DateTime } from "luxon";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import NotificationResource from "../resources/NotificationResource.js";
import { convertUTCToTimezone } from "../utils/dateutil.js";

async function GetNotificationTitle(
  user,
  fromUser = null,
  type,
  lead = null,
  agent = null,
  code = null,
  hotleads = 0,
  totalCalls = 0
) {
  let title = "";

  if (type == NotificationTypes.RedeemedAgentXCode) {
    title = `30 minutes added for using (${code})`;
  }
  if (type == NotificationTypes.LeadCalledBack) {
    title = `${lead?.firstName || "New Lead"} called back`;
  }
  if (type == NotificationTypes.NoCallsIn3Days) {
    title = `Your  calls have stopped for 3 days`;
  }
  if (type == NotificationTypes.PaymentFailed) {
    title = `Urgent! Payment method failed`;
  }
  if (type == NotificationTypes.Redeemed60Min) {
    title = `60 minutes added for aborting plan cancellation`;
  }
  if (type == NotificationTypes.InviteAccepted) {
    title = `${fromUser.name} accepted your invite`;
  }
  if (type == NotificationTypes.Hotlead) {
    title = `${lead.firstName} is a hotlead 🔥`;
  }
  if (type == NotificationTypes.TotalHotlead) {
    //calculate hotleads today.

    title = `You have ${hotleads} hotleads today 🔥`;
  }
  if (type == NotificationTypes.CallsMadeByAgent) {
    //calculate hotleads today.

    title = `You have called ${totalCalls} leads today `;
  }
  if (type == NotificationTypes.MeetingBooked) {
    title = `${lead?.firstName || "New Lead"} booked a meeting 🗓️`;
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
  code = null,
  hotleads = 0,
  totalCalls = 0
) => {
  console.log("Data in add not ", { user, fromUser, type, lead, agent, code });
  try {
    let title = await GetNotificationTitle(
      user,
      fromUser,
      type,
      lead,
      agent,
      code,
      hotleads,
      totalCalls
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
      if (!user) {
        res.send({
          status: false,
          message: "Unauthenticated user",
        });
      }

      let notsUpdated = await db.NotificationModel.update(
        {
          isSeen: true,
        },
        {
          where: {
            userId: user.id,
          },
        }
      );

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

export const ReadAllNotifications = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });

      let nots = await db.NotificationModel.update(
        {
          isSeen: true,
        },
        {
          where: {
            userId: user.id,
          },
        }
      );

      res.send({
        status: true,
        message: `Notifications seen`,
        data: null,
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
  try {
    let date = new Date().toISOString();
    console.log("Current time server ", date);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Set to start of day

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // Set to end of day

    let notSent = await db.DailyNotificationModel.findAll({
      where: {
        createdAt: {
          [db.Sequelize.Op.gte]: startOfToday, // Greater than or equal to the start of the day
          [db.Sequelize.Op.lt]: endOfToday, // Less than the end of the day
        },
      },
    });

    let userIds = [];
    if (notSent && notSent.length > 0) {
      userIds = notSent.map((not) => not.userId);
    }

    let users = await db.User.findAll({
      where: {
        id: {
          [db.Sequelize.Op.notIn]: userIds,
        },
      },
    });
    console.log("Users to send daily notificaitons", users.length);

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
  } catch (error) {
    console.log("Error in Not Cron ", error);
  }
};

async function SendNotificationsForHotlead(user) {
  try {
    let ids = [];
    let agents = await db.AgentModel.findAll({
      where: {
        userId: user.id,
      },
    });

    if (agents && agents.length > 0) {
      ids = agents.map((item) => item.id);
    }

    await db.DailyNotificationModel.create({
      userId: user.id,
    });

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const last72Hours = new Date();
    last72Hours.setHours(last72Hours.getHours() - 72);

    let hotleads = await db.LeadCallsSent.count({
      where: {
        agentId: {
          [db.Sequelize.Op.in]: ids,
        },
        hotlead: true,
        createdAt: {
          [db.Sequelize.Op.gte]: last24Hours,
        },
      },
    });

    let totalCalls = await db.LeadCallsSent.count({
      where: {
        agentId: {
          [db.Sequelize.Op.in]: ids,
        },

        createdAt: {
          [db.Sequelize.Op.gte]: last24Hours,
        },
      },
    });

    if (totalCalls == 0) {
      totalCalls = await db.LeadCallsSent.count({
        where: {
          agentId: {
            [db.Sequelize.Op.in]: ids,
          },

          createdAt: {
            [db.Sequelize.Op.gte]: last72Hours,
          },
        },
      });
      if (totalCalls == 0) {
        //send No Calls in 3 days not NoCallsIn3Days
        await AddNotification(
          user,
          null,
          NotificationTypes.NoCallsIn3Days,
          null,
          null,
          null,
          0,
          0
        );
      }
    }

    console.log(`Calls made by ${user.name} | ${totalCalls}`);
    if (totalCalls > 1) {
      await AddNotification(
        user,
        null,
        NotificationTypes.CallsMadeByAgent,
        null,
        null,
        null,
        0,
        totalCalls
      );
    }
    if (hotleads > 1) {
      await AddNotification(
        user,
        null,
        NotificationTypes.TotalHotlead,
        null,
        null,
        null,
        hotleads,
        0
      );
    } else {
      // console.log("Hotleads are less than 1");
    }
  } catch (error) {
    console.log("Error adding not ", error);
  }
}

// async function SendNotificationsForHotlead(user) {
//   try {
//     let agentsAssignedToCadence = await db.PipelineCadence.findAll();
//     let mainAgentIds = [];
//     if (agentsAssignedToCadence && agentsAssignedToCadence.length > 0) {
//       mainAgentIds = agentsAssignedToCadence.map((agent) => agent.mainAgentId);
//     }

//     console.log("Assigned agents ", mainAgentIds);
//     // let ids = [];
//     let agents = await db.AgentModel.findAll({
//       where: {
//         userId: user.id,
//         mainAgentId: {
//           [db.Sequelize.Op.in]: mainAgentIds,
//         },
//       },
//     });
//     console.log("Total subaagents ", agents?.length);
//     await db.DailyNotificationModel.create({
//       userId: u.id,
//     });
//     for (const agent of agents) {
//       let hotleads = await db.LeadCallsSent.count({
//         where: {
//           agentId: agent.id,
//           hotlead: true,
//         },
//       });
//       if (hotleads > 0) {
//         await AddNotification(
//           u,
//           null,
//           NotificationTypes.TotalHotlead,
//           null,
//           agent,
//           null
//         );
//       } else {
//         console.log("Hotleads are less than 1");
//       }
//     }
//   } catch (error) {
//     console.log("Error adding not ");
//   }
// }
