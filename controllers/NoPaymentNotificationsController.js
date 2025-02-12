import db from "../models/index.js";
import JWT from "jsonwebtoken";
import { DateTime } from "luxon";
import { NotificationTypes } from "../models/user/NotificationModel.js";

import { AddNotification } from "../controllers/NotificationController.js";
import { id } from "date-fns/locale";
import { UserRole } from "../models/user/userModel.js";

export async function CheckAndSendNoPaymentMethodAddedNotifications() {
  let date10DaysAgo = new Date();
  date10DaysAgo.setDate(date10DaysAgo.getDate() - 10); // Correctly subtract 7 days from the current date

  let payments = await db.PaymentMethod.findAll();
  let userIds = [];
  if (payments && payments.length > 0) {
    payments.map((item) => {
      if (!userIds.includes(item.userId)) {
        userIds.push(item.userId);
      }
    });
  }
  const users = await db.User.findAll({
    where: {
      userRole: "AgentX",
      // createdAt: {
      //   [db.Sequelize.Op.gt]: new Date("2025-02-10 00:00:00"),
      // },
      [db.Sequelize.Op.and]: {
        id: {
          [db.Sequelize.Op.notIn]: userIds,
        },
        id: {
          [db.Sequelize.Op.gte]: 179,
        },
      },
      // id: 174,
    },
    // include: [
    //   {
    //     model: db.PaymentMethod,
    //     as: "paymentMethods",
    //     required: false, // LEFT JOIN
    //     attributes: ["id"],
    //     where: {
    //       id: null, // No payment method linked
    //     },
    //   },
    // ],
  });

  //send these users notifications
  console.log("NoPayment: Found users to send ", users.length);

  for (const u of users) {
    console.log("user ", u.id);
    SendNoPaymentNotificaiton(u, 0, NotificationTypes.NoPaymentAdded); // Immediately
    SendNoPaymentNotificaiton(u, 3, NotificationTypes.NoPaymentFoMo); // 3 days later after 7 days inactivity
    SendNoPaymentNotificaiton(u, 5, NotificationTypes.NoPaymentScarcity); // 5 days later after 7 days inactivity
    SendNoPaymentNotificaiton(u, 7, NotificationTypes.NoPaymentUrgentWarning); // 7 days later after 7 days inactivity
    SendNoPaymentNotificaiton(u, 10, NotificationTypes.NoPaymentAiReset); // 10 days later after 7 days inactivity
    // SendNoPaymentNotificaiton(u, 27, NotificationTypes.TerritoryUpdate); // 3 days later after 7 days inactivity
  }
}

async function SendNoPaymentNotificaiton(
  user,
  forDays = 8,
  type = NotificationTypes.SocialProof
) {
  //   if (plan) {
  //check last call date
  // console.log("Sending for user ", user.id);
  let days = await getDaysSinceRegisteration(user.id);
  console.log(` User${user.id} days passed `, days);
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
      //   await AddNotification(user, null, type);
      await AddNotification(
        user,
        null,
        type,
        null,
        null,
        null,
        0,
        0,
        0,
        null,
        null,
        null,
        true //emailOnly
      );
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

async function getDaysSinceRegisteration(userId) {
  try {
    // Fetch the user record to get the account creation date
    const user = await db.User.findOne({
      attributes: ["createdAt"], // Fetch the account creation date
      where: {
        id: userId, // Filter by userId
      },
    });

    if (!user) {
      return 0;
    }
    const accountCreationDate = user.createdAt;
    const now = new Date();
    const daysSinceAccountCreation = Math.floor(
      (now - new Date(accountCreationDate)) / (1000 * 60 * 60 * 24)
    );

    return daysSinceAccountCreation;
  } catch (error) {
    console.error("Error fetching last call or account creation date:", error);
    return 0;
  }
}

// CheckAndSendNoPaymentMethodAddedNotifications();
