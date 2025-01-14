import db from "../models/index.js";
import JWT from "jsonwebtoken";
import { DateTime } from "luxon";
import { NotificationTypes } from "../models/user/NotificationModel.js";

import { AddNotification } from "../controllers/NotificationController.js";

export async function SendNotificationsForNoCalls5Days(user) {
  const HoursIn5Days = 120;
  console.log("Sending No Calls Not to ", user.id);
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

    const last5Days = new Date();
    last5Days.setHours(last5Days.getHours() - HoursIn5Days);

    // Check user's account creation date
    const userCreatedAt = new Date(user.createdAt);

    console.log("Sending no calls to", user.id);

    let totalCalls = await db.LeadCallsSent.count({
      where: {
        agentId: {
          [db.Sequelize.Op.in]: ids,
        },
        createdAt: {
          [db.Sequelize.Op.gte]: last5Days,
        },
      },
    });

    if (totalCalls == 0) {
      console.log("Total calls were 0 576 line");

      if (userCreatedAt < last5Days) {
        console.log("User account was created before 120 horus ", user.id);
        // if userCreatedAt was before 72Hours ago

        //check last NoCallNotification
        let not = await db.NotificationModel.findOne({
          where: {
            userId: user.id,
            type: NotificationTypes.Inactive5Days,
            createdAt: {
              [db.Sequelize.Op.gte]: last72Hours,
            },
          },
        });
        let canSendNewNot = false;
        if (not) {
          console.log(
            "Not was already sent for gamification 5 days inactivity so don't send new"
          );
          // const last5DaysOfNotSent = new Date();
          // last5DaysOfNotSent.setHours(
          //   last5DaysOfNotSent.getHours() - HoursIn5Days
          // );
          // const notSentAt = new Date(not.createdAt);
          // if (notSentAt < last5DaysOfNotSent) {
          //   console.log(
          //     "No notificaiton was sent in the last 120 hours to  ",
          //     user.id
          //   );
          //   //if the last no calls notification was sent before 72 hours ago send again
          //   canSendNewNot = true;
          // } else {
          //   console.log(
          //     "Notificaiton was already sent in the last 120 hours to  ",
          //     user.id
          //   );
          // }
          // canSendNewNot = false; // if already sent then never send again
        } else {
          canSendNewNot = true;
        }
        console.log("Here ");
        console.log(totalCalls);
        console.log(canSendNewNot);
        if (totalCalls == 0 && canSendNewNot) {
          // Send "No Calls in 3 days" notification
          await AddNotification(
            user,
            null,
            NotificationTypes.Inactive5Days,
            null,
            null,
            null,
            0,
            0
          );
        }
      }
    } else {
      console.log("User has many calls");
    }
  } catch (error) {
    console.log("Error adding not ", error);
  }
}

export async function SendFeedbackNotificationsAfter14Days(user) {
  const HoursIn5Days = 14 * 24; // hours in 14 days
  console.log("Sending No Calls Not to ", user.id);
  try {
    const last5Days = new Date();
    last5Days.setHours(last5Days.getHours() - HoursIn5Days);

    // Check user's account creation date
    const userCreatedAt = new Date(user.createdAt);

    console.log("Sending no calls to", user.id);

    if (userCreatedAt <= last5Days) {
      console.log("User account was created before 14 days ", user.id);
      console.log("Here ");

      await AddNotification(
        user,
        null,
        NotificationTypes.Day14FeedbackRequest,
        null,
        null,
        null,
        0,
        0
      );
    }
    // } else {
    //   console.log("User has many calls");
    // }
  } catch (error) {
    console.log("Error adding not ", error);
  }
}

// export const SendUpgradeSuggestionNotification = async () => {
//   try {
//     const users = await db.User.findAll({
//       attributes: ["id", "name", "email"], // Adjust attributes based on your User model
//       include: [
//         {
//           model: db.PlanHistory,
//           as: "planHistory", // Use the correct alias defined in your association
//           attributes: ["id", "type", "status", "userId"],
//           where: {
//             type: "Plan30",
//           },
//           required: true, // Ensures only users with matching plan histories are included
//         },
//       ],
//       having: db.Sequelize.where(
//         db.Sequelize.literal(
//           "(SELECT COUNT(*) FROM PlanHistories WHERE PlanHistories.userId = User.id AND PlanHistories.type = 'Plan30')"
//         ),
//         {
//           [db.Sequelize.Op.eq]: 2,
//         }
//       ),
//       group: ["User.id"], // Group by User ID to ensure aggregate filtering works
//       raw: true, // Optional: If you want raw results instead of Sequelize instances
//     });

//     if (users && users.length > 0) {
//       // Handle the users who meet the criteria
//       // console.log("Users matching criteria:", users);
//       for (const u of users) {
//       }
//     }
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     throw error;
//   }
// };

export const SendUpgradeSuggestionNotification = async (user) => {
  // let planHistory = await db.PlanHistory.findAll({
  //   where: {
  //     userId: user.id,

  //   }
  // })
  await AddNotification(
    user,
    null,
    NotificationTypes.PlanUpgradeSuggestionFor30MinPlan
  );
};
