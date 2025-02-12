import db from "../models/index.js";
import JWT from "jsonwebtoken";
import { DateTime } from "luxon";
import { NotificationTypes } from "../models/user/NotificationModel.js";

import { AddNotification } from "../controllers/NotificationController.js";
import { id } from "date-fns/locale";
import { UserRole } from "../models/user/userModel.js";

export async function CheckAndSend7DaysInactivityNotifications() {
  let date7DaysAgo = new Date();
  date7DaysAgo.setDate(date7DaysAgo.getDate() - 7); // Correctly subtract 7 days from the current date

  let payments = await db.PaymentMethod.findAll();
  let userIds = [];
  if (payments && payments.length > 0) {
    payments.map((item) => {
      if (!userIds.includes(item.userId)) {
        userIds.push(item.userId);
      }
    });
  }
  let users = await db.User.findAll({
    where: {
      userRole: UserRole.AgentX,
      id: {
        [db.Sequelize.Op.in]: userIds,
      },
    },
  });

  //send these users notifications
  console.log("InActiveNot: Found users to send ", users.length);

  for (const u of users) {
    let timeZone = u.timeZone || "America/Los_Angeles";
    // console.log("User Time zone is ", timeZone);
    let plan = await db.PlanHistory.findOne({
      where: {
        userId: u.id,
        status: "active",
      },
    });
    if (!plan) {
      // console.log("User don't have active plan ", u.id);
      //   return;
    } else {
      let agents = await db.MainAgentModel.findAll({
        where: {
          userId: u.id,
        },
      });
      let agentIds = [];
      if (agents && agents.length > 0) {
        agentIds = agents.map((agent) => agent.id);
      }
      let callsMadeInLast7Days = await db.LeadCallsSent.findAll({
        where: {
          mainAgentId: {
            [db.Sequelize.Op.in]: agentIds,
          },
          createdAt: {
            [db.Sequelize.Op.gt]: date7DaysAgo,
          },
        },
      });
      // console.log(`Calls made by ${u.id} are ${callsMadeInLast7Days.length}`);
      if (callsMadeInLast7Days.length > 0) {
        continue;
      }
      //Check Trial Ticking
      SendInactiveNotificaiton(u, 8, NotificationTypes.SocialProof); // 1 days later after 7 days inactivity
      SendInactiveNotificaiton(u, 10, NotificationTypes.CompetitiveEdge); // 3 days later after 7 days inactivity
      SendInactiveNotificaiton(u, 12, NotificationTypes.FOMOAlert); // 5 days later after 7 days inactivity
      SendInactiveNotificaiton(u, 14, NotificationTypes.TrainingReminder); // 7 days later after 7 days inactivity
      SendInactiveNotificaiton(u, 21, NotificationTypes.Exclusivity); // 14 days later after 7 days inactivity
      SendInactiveNotificaiton(u, 27, NotificationTypes.TerritoryUpdate); // 3 days later after 7 days inactivity
    }
  }
}

async function SendInactiveNotificaiton(
  user,
  forDays = 8,
  type = NotificationTypes.SocialProof
) {
  //   if (plan) {
  //check last call date
  // console.log("Sending for user ", user.id);
  let days = await getDaysSinceLastCall(user.id);
  // console.log("User days passed ", days);
  //   let type = NotificationTypes.SocialProof;
  // Check if 1 hours (in milliseconds) or more have passed
  if (days == forDays) {
    let not = await db.NotificationModel.findOne({
      where: {
        userId: user.id,
        type: type,
      },
    });
    if (!not) {
      await AddNotification(user, null, type);
    }
  } else {
    // console.log(
    //   `Only ${days} gone by since last call ${user.id} so can not send for ${forDays}`
    // );
    return;
  }
  //   }
  //   else {
  //     console.log("User's plan is not active ", user.id);
  //   }
}

async function getDaysSinceLastCall(userId) {
  try {
    // Fetch the user record to get the account creation date
    const user = await db.User.findOne({
      attributes: ["createdAt"], // Fetch the account creation date
      where: {
        id: userId, // Filter by userId
      },
    });

    if (!user) {
      // console.log(`No user found with userId: ${userId}`);
      return 0;
    }

    // Fetch the most recent call for the given userId
    const lastCall = await db.LeadCallsSent.findOne({
      attributes: [
        "createdAt", // Fetch the creation date of the call
        [
          db.Sequelize.fn(
            "DATEDIFF",
            db.Sequelize.literal("NOW()"),
            db.Sequelize.col("createdAt")
          ),
          "daysSinceLastCall",
        ],
      ],
      where: {
        mainAgentId: userId, // Filter by mainAgentId
      },
      order: [["createdAt", "DESC"]], // Order by most recent call
      limit: 1, // Get only the most recent call
    });

    // Calculate the days since the last call or since account creation
    if (lastCall) {
      const daysSinceLastCall = lastCall.dataValues.daysSinceLastCall;
      // console.log(`Days since last call: ${daysSinceLastCall}`);
      return daysSinceLastCall;
    } else {
      const accountCreationDate = user.createdAt;
      const now = new Date();
      const daysSinceAccountCreation = Math.floor(
        (now - new Date(accountCreationDate)) / (1000 * 60 * 60 * 24)
      );
      // console.log(
      //   `No calls found. Days since account creation: ${daysSinceAccountCreation} for user ${userId}`
      // );
      return daysSinceAccountCreation;
    }
  } catch (error) {
    console.error("Error fetching last call or account creation date:", error);
    return 0;
  }
}
