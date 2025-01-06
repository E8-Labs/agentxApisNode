import db from "../models/index.js";
import JWT from "jsonwebtoken";
import { DateTime } from "luxon";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import NotificationResource from "../resources/NotificationResource.js";
import { convertUTCToTimezone } from "../utils/dateutil.js";
import { sendPushNotification } from "../services/firebase.js";

async function GetNotificationTitle(
  user,
  fromUser = null,
  type,
  lead = null,
  agent = null,
  code = null,
  hotleads = 0,
  totalCalls = 0,
  minutes = 0
) {
  let title = "";
  let body = "";
  //
  if (type == NotificationTypes.Trial30MinTicking) {
    title = `30 min Trial is Ticking! ⏳`;
    body =
      "Your 30 min trial expires in 7 days. Start now to make the most of it!";
  }
  if (type == NotificationTypes.X3MoreLikeyToWin) {
    title = `3x More Likely to Win! 🤩`;
    body =
      "Agents who upload leads on Day 1 book 3x more listings. Don’t miss out!";
  }
  if (type == NotificationTypes.NeedHand) {
    title = `Need a Hand? 🤝`;
    body = "Didn’t get through everything in the live training? We can help.";
  }
  if (type == NotificationTypes.TrialReminder) {
    title = `Trial Reminder! ⏳`;
    body =
      "Your 30 min trial ends soon. Use them or lose them—call opportunities now!";
  }
  if (type == NotificationTypes.NeedHelpDontMissOut) {
    title = `Need help? Don’t Miss Out! 💼`;
    body =
      "Only 2 days left to use your 30 minutes! Agents are booking $700k+ listings";
  }
  if (type == NotificationTypes.LastChanceToAct) {
    title = `Last Chance to Act! 🚨`;
    body = "Only 1 day left to use your 30 minutes of AI talk time.";
  }
  if (type == NotificationTypes.LastDayToMakeItCount) {
    title = `Last Day to Make It Count! ⏰`;
    body = "Final call! Your 30 minutes of AI talk time expire at midnight.";
  }
  if (type == NotificationTypes.TrialTime2MinLeft) {
    title = `2 min Reminder!`;
    body = "Trial ending soon. Just 2 minutes left! Your plan will auto-renew.";
  }
  if (type == NotificationTypes.PlanRenewed) {
    title = `Minutes Have Been Renewed! 🎉`;
    body = `${minutes} Minutes Added. Keep calling opportunities!`;
  }

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

  return { title, body };
}
/**
 * Creates a notificaiton for the given details
 * @param {Object} user - The receiving user.
 * @param {Object} fromUser - The sending user.
 * @param {string} type - Type of notification.
 * @param {Object} lead - Lead  if any.
 * @param {Object} agent - Agent  if any.
 * @param {string} code - codeRedeemed .
 * @param {number} hotleads - Number of hotleads today
 * @param {number} totalCalls - Number of calls today
 * @param {number} minutes - Minutes Renewed for plan
 */
export const AddNotification = async (
  user,
  fromUser = null,
  type,
  lead = null,
  agent = null,
  code = null,
  hotleads = 0,
  totalCalls = 0,
  minutes = 0
) => {
  // console.log("Data in add not ", { user, fromUser, type, lead, agent, code });
  try {
    let { title, body } = await GetNotificationTitle(
      user,
      fromUser,
      type,
      lead,
      agent,
      code,
      hotleads,
      totalCalls,
      minutes
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
      body: body,
    });

    let resource = await NotificationResource(not);
    if (user.fcm_token && user.fcm_token.trim()) {
      await sendPushNotification(user.fcm_token, {
        title: title,
        body: body,
        data: resource,
      });
    }
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
        order: [["createdAt", "DESC"]],
      });

      // let unread = await db.NotificationModel.count({
      //   where: {
      //     isSeen: false,
      //     userId: user.id,
      //   },
      // });

      res.send({
        status: true,
        message: `Notifications list`,
        data: {
          notifications: await NotificationResource(nots),
          // unread: unread,
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

export const SendTestNotification = async (req, res) => {
  await sendPushNotification(
    "c0vMoCubo_yuExm2T2HfjL:APA91bF6KX6hyAUUIlxntFAiTuEI7_wg7IkDyx2-2KkDER9To6sU4TDgLIbautQYWsPYd9FPttwHKjySCDEnvZQdv2sN_hM8xEg1IJ8pu31IrdSn6gloUAI",
    { title: "Test Notificaiton", body: "This is test notification", data: {} }
  );
  res.send({ status: true, message: "Notification sent" });
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
    try {
      SendAutoDailyNotificationsFor7Days();
    } catch (error) {}
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

async function SendAutoDailyNotificationsFor7Days() {
  let date7DaysAgo = new Date();
  date7DaysAgo.setDate(date7DaysAgo.getDate() - 8); // Correctly subtract 7 days from the current date
  let users = await db.User.findAll({
    where: {
      createdAt: {
        [db.Sequelize.Op.gt]: date7DaysAgo,
      },
    },
  });
  console.log("Users to send 7 days notificaitons", users.length);

  for (const u of users) {
    let timeZone = u.timeZone || "America/Los_Angeles";
    console.log("User Time zone is ", timeZone);

    //Check Trial Ticking
    CheckAndSendTrialTickingNotificaitonSent(u);
    CheckAndSendLikelyToWinNotificaitonSent(u);
    CheckAndSendNeedHandNotificaitonSent(u);
    CheckAndSendTrialReminderNotificaitonSent(u);
    CheckAndSendNeedHelpDontMissoutNotificaitonSent(u);
    CheckAndSendLastDayToMakeItCountNotificaitonSent(u);
    CheckAndSendLastChanceToActNotificaitonSent(u);
    CheckAndSendTwoMinuteTrialLeftNotificaitonSent(u);
  }
}

//sent 1 hr after account creation
async function CheckAndSendTrialTickingNotificaitonSent(user) {
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 1 hours (in milliseconds) or more have passed
  if (timeDifference >= 1 * 60 * 60 * 1000) {
    console.log("3 hours or more have passed since the account was created.");
  } else {
    console.log("Less than 3 hours have passed since the account was created.");
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: NotificationTypes.Trial30MinTicking,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for Trial Ticking");
  } else {
    await AddNotification(
      user,
      null,
      NotificationTypes.Trial30MinTicking,
      null,
      null,
      null,
      null,
      null,
      0
    );
  }
}

//Day 1: sent 3 hr after account creation
async function CheckAndSendLikelyToWinNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  // if (!user.isTrial) {
  //   console.log("User is not on trial");
  //   return;
  // }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 3 hours (in milliseconds) or more have passed
  if (timeDifference >= 3 * 60 * 60 * 1000) {
    console.log("3 hours or more have passed since the account was created.");
  } else {
    console.log("Less than 3 hours have passed since the account was created.");
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: NotificationTypes.X3MoreLikeyToWin,
    },
  });
  if (not) {
    console.log(
      "Notificaiton already sent for ",
      NotificationTypes.X3MoreLikeyToWin
    );
  } else {
    await AddNotification(
      user,
      null,
      NotificationTypes.X3MoreLikeyToWin,
      null,
      null,
      null,
      null,
      null,
      0
    );
  }
}

//Day 2: sent 1 day & 3 hr after account creation
async function CheckAndSendNeedHandNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  // if (!user.isTrial) {
  //   console.log("User is not on trial");
  //   return;
  // }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.NeedHand;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 3 hours (in milliseconds) or more have passed
  if (timeDifference >= 27 * 60 * 60 * 1000) {
    console.log("27 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 27 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log(`${user.id} | Notificaiton already sent for `, type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}

//Day 3: sent 2 day & 3 hr after account creation
async function CheckAndSendTrialReminderNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.TrialReminder;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 2 days and 3 hours (in milliseconds) or more have passed
  if (timeDifference >= 51 * 60 * 60 * 1000) {
    console.log("51 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 51 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}

//Day 5: sent 4 day & 3 hr after account creation
async function CheckAndSendNeedHelpDontMissoutNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.NeedHelpDontMissOut;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 99 hours (in milliseconds) or more have passed
  if (timeDifference >= 99 * 60 * 60 * 1000) {
    console.log("99 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 99 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}

//Day 6: sent 5 day & 3 hr after account creation
async function CheckAndSendLastChanceToActNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.LastChanceToAct;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 99 hours (in milliseconds) or more have passed
  if (timeDifference >= 123 * 60 * 60 * 1000) {
    console.log("123 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 123 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}

//Day 7: sent 6 day & 3 hr after account creation
async function CheckAndSendLastDayToMakeItCountNotificaitonSent(user) {
  let leads = await db.LeadModel.count({
    where: {
      userId: user.id,
    },
  });
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  if (leads > 0) {
    console.log("User have already added leads");
    return;
  }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.LastDayToMakeItCount;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 147 hours (in milliseconds) or more have passed
  if (timeDifference >= 147 * 60 * 60 * 1000) {
    console.log("147 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 147 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}

//When 2 minutes of trial time is left
async function CheckAndSendTwoMinuteTrialLeftNotificaitonSent(user) {
  if (!user.isTrial) {
    console.log("User is not on trial");
    return;
  }
  if (user.totalAvailableSeconds > 120) {
    return;
  }
  // if (leads > 0) {
  //   console.log("User have already added leads");
  //   return;
  // }
  //check the datetime to see if it is gt 3 hours and less than 4
  let now = new Date(); // Current time
  let createdAt = new Date(user.createdAt); // Convert user.createdAt to a Date object

  let type = NotificationTypes.TrialTime2MinLeft;
  // Calculate the difference in milliseconds
  let timeDifference = now - createdAt;

  // Check if 147 hours (in milliseconds) or more have passed
  if (timeDifference >= 147 * 60 * 60 * 1000) {
    console.log("147 hours or more have passed since the account was created.");
  } else {
    console.log(
      "Less than 147 hours have passed since the account was created."
    );
    return;
  }

  let not = await db.NotificationModel.findOne({
    where: {
      userId: user.id,
      type: type,
    },
  });
  if (not) {
    console.log("Notificaiton already sent for ", type);
  } else {
    await AddNotification(user, null, type, null, null, null, null, null, 0);
  }
}

SendAutoDailyNotificationsFor7Days();
