import db from "../models/index.js";
import JWT from "jsonwebtoken";
import { DateTime } from "luxon";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import NotificationResource from "../resources/NotificationResource.js";
import { convertUTCToTimezone } from "../utils/dateutil.js";
import { sendPushNotification } from "../services/firebase.js";
import { GetAgentXCodeUsageEmailReplacedVariables } from "../emails/AgentXCodeUsageEmail.js";
import { SendEmail } from "../services/MailService.js";
import { GetInviteAcceptedEmailReplacedVariables } from "../emails/InviteAcceptedEmail.js";
import { GenerateHotLeadEmail } from "../emails/HotLeadEmail.js";
import { GenerateMeetingBookedEmail } from "../emails/MeetingBookedEmail.js";
import { GeneratePaymentMethodFailedEmail } from "../emails/PaymentFailedEmail.js";
import { GenerateCallsStoppedEmail } from "../emails/CallsStoppedEmail.js";
import { GenerateTrialTickingEmail } from "../emails/TrialTickingEmail.js";
import { GenerateThreeTimesWinEmail } from "../emails/MoreLikelyToWinEmail.js";
import { generateNeedAHandEmail } from "../emails/NeedHandEmail.js";
import { generateTrialReminderEmail } from "../emails/TrialReminderEmail.js";
import { generateDontMissOutEmail } from "../emails/DontMissOutEmail.js";
import { generateOneDayLeftEmail } from "../emails/LastChanceEmail.js";
import { generateTrialEndsTonightEmail } from "../emails/LastDayEmail.js";
import { generateFiveMinutesLeftEmail } from "../emails/FiveMinuteTrialReminderEmail.js";
import { generateMinutesRenewedEmail } from "../emails/MinutesRenewalEmail.js";
import { FindPlanWithMinutes } from "../models/user/payment/paymentPlans.js";
import {
  CheckAndSendTrialTickingNotificaitonSent,
  CheckAndSendLikelyToWinNotificaitonSent,
  CheckAndSendNeedHandNotificaitonSent,
  CheckAndSendTrialReminderNotificaitonSent,
  CheckAndSendNeedHelpDontMissoutNotificaitonSent,
  CheckAndSendLastDayToMakeItCountNotificaitonSent,
  CheckAndSendLastChanceToActNotificaitonSent,
  CheckAndSendTwoMinuteTrialLeftNotificaitonSent,
} from "./CheckAndSendTrialNotificaitons.js";
import {
  SendAppointmentNotifications,
  SendFeedbackNotificationsAfter14Days,
  SendNotificationsForNoCalls5Days,
  SendUpgradeSuggestionNotification,
} from "./GamificationNotifications.js";
import { generateInactive5DaysEmail } from "../emails/gamification/FiveDayInactiveEmail.js";
import { constants } from "../constants/constants.js";
import { generateFeedbackRequest14DaysEmail } from "../emails/gamification/FeedbackRequestEmail.js";
import { generatePlanUpgradeEmail } from "../emails/gamification/PlanUpgradeEmail.js";
import { AreaCodes, ExtractAreaCode } from "../utils/USAreaCodes.js";
import { CheckAndSend7DaysInactivityNotifications } from "./InactiveUserNotifications.js";
import { generateFomoEmail } from "../emails/InactiveUserEmails/FomoEmail.js";
import { generateExclusivityEmail } from "../emails/InactiveUserEmails/ExclusivityEmail.js";
import { generateTerritoryUpdateEmail } from "../emails/InactiveUserEmails/TerritoryUpdate.js";
import { generateSocialProofEmail } from "../emails/InactiveUserEmails/SocialProofEmail.js";
import { generateDesktopEmail } from "../emails/general/DesktopEmail.js";
import { GetTeamAdminFor, GetTeamIds } from "../utils/auth.js";
import { UserRole } from "../models/user/userModel.js";
import { CheckAndSendNoPaymentMethodAddedNotifications } from "./NoPaymentNotificationsController.js";
import { GenerateNoPaymentEmail } from "../emails/noPaymentNotifications/NoPaymentAddedEmail.js";
import { GenerateNoPaymentFoMoEmail } from "../emails/noPaymentNotifications/NoPaymentFoMoEmail.js";
import { GenerateNoPaymentScarcityEmail } from "../emails/noPaymentNotifications/NoPaymetScarcityEmail.js";
import { GenerateNoPaymentUrgentWarningEmail } from "../emails/noPaymentNotifications/NoPaymentUrgentWarningEmail.js";
import { GenerateNoPaymentAIResetEmail } from "../emails/noPaymentNotifications/NoPaymentAIResetEmail.js";

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
  let city = "New York";
  let state = "NY";
  let areaCode = ExtractAreaCode(user.phone);
  if (areaCode) {
    city = areaCode.city;
    state = areaCode.state;
  }
  console.log("City is ", city);
  //Inactive User
  if (type == NotificationTypes.SocialProof) {
    if (typeof city !== "undefined") {
      title = `Sarah in ${city} got 2 Listings!`;
    } else {
      title = `Sarah got 2 Listings!`;
    }

    body = "More calls = more opportunities. Upload your leads now.";
  }
  if (type == NotificationTypes.CompetitiveEdge) {
    title = `Secure Your Edge!`;
    if (typeof city !== "undefined") {
      body = `Few agents in ${
        city || "New York"
      } use AI. Act before others join`;
    } else {
      body = `Few agents use AI. Act before others join`;
    }
  }
  if (type == NotificationTypes.FOMOAlert) {
    title = `Don’t Miss Out!`;
    if (typeof city !== "undefined") {
      body = `4 listings secured in ${city} in the last 2 weeks`;
    } else {
      body = `4 listings secured in the last 2 weeks`;
    }
  }
  if (type == NotificationTypes.TrainingReminder) {
    title = `Need Help?`;
    body = "Join our live webinar and book more appointments";
  }
  if (type == NotificationTypes.Exclusivity) {
    title = `You’re Leading!`;
    body = `Few agents in ${city} use AI. Maximize your lead`;
  }
  if (type == NotificationTypes.TerritoryUpdate) {
    title = `2 Listings Nearby!`;
    body = "2 appointments made within 20 miles. Don’t miss out!";
  }

  //Gamification
  if (type == NotificationTypes.FirstLeadUpload) {
    title = `Congrats on Your First Upload!`;
    body = "Let’s start calling to get 🔥 leads!";
  }
  if (type == NotificationTypes.ThousandCalls) {
    title = `You’re in the Top 40%!`;
    body = "Keep going—top 20% are booking 3+ listings this month!";
  }
  if (type == NotificationTypes.Inactive5Days) {
    title = `Let’s Fill Your Pipeline!`;
    body = "Call 200 homeowners to see a 10x increase in hot leads";
  }
  if (type == NotificationTypes.TwoThousandCalls) {
    title = `You’re in the Top 30%!`;
    body = "Keep it up—top 10% are booking 4+ listings this month!";
  }
  if (type == NotificationTypes.FirstAppointment) {
    title = `Congrats on Your First Appointment!`;
    body = "This is just the beginning. Let’s keep the momentum going!";
  }
  if (type == NotificationTypes.ThreeAppointments) {
    title = `Hat Trick Secured! 🎉`;
    body = "3 appointments booked—keep it rolling!";
  }
  if (type == NotificationTypes.SevenAppointments) {
    title = `You’re on Fire! 🔥`;
    body = "7 streak achieved—your competition doesn’t stand a chance!";
  }
  if (type == NotificationTypes.Day14FeedbackRequest) {
    title = `We’d Love Your Feedback!`;
    body = "Share your experience so we can make AgentX better for you";
  }
  if (type == NotificationTypes.TestAINotification) {
    title = `Test Your AI!`;
    body = "Make sure your AI delivers quality results";
  }
  if (type == NotificationTypes.PlanUpgradeSuggestionFor30MinPlan) {
    title = `Save Big—Upgrade!`;
    body = "Upgrade to 120 mins and save 40%";
  }
  //#####################################

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
  if (type == NotificationTypes.TrialTime5MinLeft) {
    title = `5 min Reminder!`;
    body = "Just 5 minutes left! Your plan will auto-renew.";
  }
  if (type == NotificationTypes.PlanRenewed) {
    title = `Minutes Have Been Renewed! 🎉`;
    body = `${minutes} Minutes Added. Keep calling opportunities!`;
  }
  if (type == NotificationTypes.SubscriptionRenewed) {
    title = `Subscription has renewed`;
    body = `${minutes} Minutes Added. Keep going!`;
  }

  if (type == NotificationTypes.RedeemedAgentXCode) {
    title = `30 minutes added for using (${code})`;
  }
  if (type == NotificationTypes.RedeemedAgentXCodeMine) {
    title = `30 minutes added for using (${code})`;
  }
  if (type == NotificationTypes.LeadCalledBack) {
    title = `${lead?.firstName || "New Lead"} called`;
  }
  if (type == NotificationTypes.NoCallsIn3Days) {
    title = `Your calls have stopped for 3 days`;
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
    title = `${lead.firstName} is a hot lead 🔥`;
  }
  if (type == NotificationTypes.TotalHotlead) {
    //calculate hotleads today.

    title = `You have ${hotleads} hot leads today 🔥`;
  }
  if (type == NotificationTypes.CallsMadeByAgent) {
    //calculate hotleads today.

    title = `You have made ${totalCalls} calls today `;
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
  minutes = 0,
  recording = null,
  meetingDate = null,
  synthflowCallId = null,
  emailOnly = false
) => {
  console.log("Data in add not ", { user, fromUser, type, lead, agent, code });
  // return;
  if (user.userRole == UserRole.Invitee) {
    return;
  }
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
    // console.log("Not Title is ", title);
    let not = await db.NotificationModel.create({
      userId: user.id,
      fromUserId: fromUser?.id,
      title: title,
      type: type,
      leadId: lead?.id,
      agentId: agent?.id,
      codeRedeemed: code,
      body: body,
      synthflowCallId: synthflowCallId,
    });

    let resource = await NotificationResource(not);
    if (user.fcm_token && user.fcm_token.trim()) {
      await sendPushNotification(user.fcm_token, {
        title: title,
        body: body,
        data: resource,
      });
    }
    try {
      SendEmailForNotification(
        user,
        fromUser,
        type,
        lead,
        agent,
        code,
        hotleads,
        totalCalls,
        minutes,
        recording,
        meetingDate
      );
    } catch (error) {
      // console.log("Email error");
      console.log(error);
    }
    return not;
  } catch (error) {
    // console.log("Error adding not ", error);
    return null;
  }
};

async function SendEmailForNotification(
  user,
  fromUser = null,
  type,
  lead = null,
  agent = null,
  code = null,
  hotleads = 0,
  totalCalls = 0,
  minutes = 0,
  recording = null,
  meetingDate = null
) {
  let campaignee = await db.CampaigneeModel.findOne({
    where: {
      id: user.campaigneeId,
    },
  });

  let userCtaLink = campaignee
    ? campaignee.officeHoursUrl
    : "https://api.leadconnectorhq.com/widget/booking/SMTp2AfgjdTcjLOIUBkR";

  let emailNot = null;
  let email = user.email || "";
  if (type == NotificationTypes.NoPaymentAiReset) {
    emailNot = GenerateNoPaymentAIResetEmail(
      user.name,
      constants.BillingPage,
      ""
    );
    email = user.email;
  } else if (type == NotificationTypes.NoPaymentUrgentWarning) {
    emailNot = GenerateNoPaymentUrgentWarningEmail(
      user.name,
      constants.BillingPage,
      ""
    );
    email = user.email;
  } else if (type == NotificationTypes.NoPaymentScarcity) {
    emailNot = GenerateNoPaymentScarcityEmail(
      user.name,
      constants.BillingPage,
      "💰Agents Are Closing $700K+ Deals—Your AI is Waiting!"
    );
    email = user.email;
  } else if (type == NotificationTypes.NoPaymentFoMo) {
    emailNot = GenerateNoPaymentFoMoEmail(
      user.name,
      constants.BillingPage,
      "Click here to activate now"
    );
    email = user.email;
  } else if (type == NotificationTypes.NoPaymentAdded) {
    emailNot = GenerateNoPaymentEmail(
      user.name,
      constants.BillingPage,
      "Click here to complete your account"
    );
    email = user.email;
  } else if (type == NotificationTypes.InviteAccepted) {
    emailNot = GetInviteAcceptedEmailReplacedVariables(
      user.name,
      fromUser.name
    );
    email = user.email;
  } else if (
    type == NotificationTypes.RedeemedAgentXCode ||
    type == NotificationTypes.RedeemedAgentXCodeMine
  ) {
    emailNot = GetAgentXCodeUsageEmailReplacedVariables(user.name, code);
    email = user.email;
  } else if (type == NotificationTypes.Hotlead) {
    emailNot = GenerateHotLeadEmail(
      user.name, // Name
      lead?.firstName || "New Lead", // Leadname
      lead?.email || "Not provided", // Leademail
      lead?.phone, // Leadphone
      recording || "", // LinkToRecording
      "https://ai.myagentx.com/dashboard/leads", // CTA_Link
      "View Hot Lead and Take Action" // CTA_Text
    );
    email = user.email;
  } else if (type == NotificationTypes.MeetingBooked) {
    emailNot = GenerateMeetingBookedEmail(
      user.name, // Name
      lead?.firstName || "New Lead", // Leadname
      lead?.email || "Not provided", // Leademail
      lead?.phone, // Leadphone
      recording || "", // LinkToRecording
      meetingDate, // MeetingDateTime
      constants.LeadPage, // CTA_Link
      "View Hot Lead and Take Action" // CTA_Text
    );
    email = user.email;
  } else if (type === NotificationTypes.PaymentFailed) {
    emailNot = GeneratePaymentMethodFailedEmail(
      user.name, // Name
      "https://ai.myagentx.com/dashboard/myAccount?tab=2", // CTA_Link
      "Update Payment Method Now" // CTA_Text
    );
  } else if (type === NotificationTypes.NoCallsIn3Days) {
    emailNot = GenerateCallsStoppedEmail(
      user.name, // Name
      userCtaLink, // CTA_Link
      "Join the Live Webinar Now" // CTA_Text
    );
  } else if (type === NotificationTypes.Trial30MinTicking) {
    emailNot = GenerateTrialTickingEmail(
      user.name, // Name
      constants.LeadPage, // CTA_Link
      "Start Calling" // CTA_Text
    );
  } else if (type === NotificationTypes.X3MoreLikeyToWin) {
    emailNot = GenerateThreeTimesWinEmail(
      user.name, // Name
      constants.LeadPage, // CTA_Link
      "Upload Leads Now" // CTA_Text
    );
  } else if (type === NotificationTypes.NeedHand) {
    emailNot = generateNeedAHandEmail(
      user.name, // Name
      userCtaLink, // CTA_Link from the campaign team
      "Schedule Live Session" // CTA_Text
    );
  } else if (type === NotificationTypes.TrialReminder) {
    emailNot = generateTrialReminderEmail(
      user.name, // Name
      constants.LeadPage, // CTA_Link
      "Start Calling" // CTA_Text
    );
  } else if (type === NotificationTypes.NeedHelpDontMissOut) {
    emailNot = generateDontMissOutEmail(
      user.name, // Name
      userCtaLink, // CTA_Link
      "Schedule Live Support Session" // CTA_Text
    );
  } else if (type === NotificationTypes.LastChanceToAct) {
    emailNot = generateOneDayLeftEmail(
      user.name, // Name
      userCtaLink, // CTA_Link
      "Schedule Live Support Session" // CTA_Text
    );
  } else if (type === NotificationTypes.LastDayToMakeItCount) {
    emailNot = generateTrialEndsTonightEmail(
      user.name, // Name
      constants.LeadPage, // CTA_Link
      "Start Calling" // CTA_Text
    );
  } else if (type === NotificationTypes.TrialTime5MinLeft) {
    emailNot = generateFiveMinutesLeftEmail(
      user.name, // Name
      constants.BillingPage, // CTA_Link
      "Manage Plan" // CTA_Text
    );
  } else if (type === NotificationTypes.PlanRenewed) {
    let plan = FindPlanWithMinutes(minutes);
    emailNot = generateMinutesRenewedEmail(
      user.name, // Name
      `${minutes}`, // Minutes
      `${plan?.price || "Unknown"}` // Price
    );
  } else if (type == NotificationTypes.Inactive5Days) {
    emailNot = generateInactive5DaysEmail(
      user.name,
      constants.LeadPage,
      "Start Calling"
    );
    email = user.email;
  } else if (type == NotificationTypes.Day14FeedbackRequest) {
    emailNot = generateFeedbackRequest14DaysEmail(
      user.name,
      constants.Feedback,
      "Share Feedback"
    );
    email = user.email;
  } else if (type == NotificationTypes.PlanUpgradeSuggestionFor30MinPlan) {
    emailNot = generatePlanUpgradeEmail(
      user.name,
      constants.BillingPage,
      "Upgrade Plan"
    );
    email = user.email;
  } else if (type == NotificationTypes.SocialProof) {
    let location = ExtractAreaCode(user.phone);
    console.log("Code ", location);
    let city = location?.city || "Same city";
    emailNot = generateSocialProofEmail(
      user.name,
      city,
      constants.LeadPage,
      "Upload Leads and Start Calling"
    );
    email = user.email;
  } else if (type == NotificationTypes.FOMOAlert) {
    let location = ExtractAreaCode(user.phone);
    let city = location?.city || "Same city";
    emailNot = generateFomoEmail(
      user.name,
      city,
      constants.LeadPage,
      "Activate Your AI Now"
    );
    email = user.email;
  } else if (type == NotificationTypes.Exclusivity) {
    let location = ExtractAreaCode(user.phone);
    let city = location?.city || "Same city";
    emailNot = generateExclusivityEmail(
      user.name,
      city,
      constants.LeadPage,
      "Start Now and Stay Ahead!"
    );
    email = user.email;
  } else if (type == NotificationTypes.TerritoryUpdate) {
    let location = ExtractAreaCode(user.phone);
    let city = location?.city || "Same city";
    emailNot = generateTerritoryUpdateEmail(
      user.name,
      city,
      constants.LeadPage,
      "Start Winning Listings"
    );
    email = user.email;
  }

  if (!emailNot) {
    return;
  }

  let sent = await SendEmail(email, emailNot.subject, emailNot.html);
}

export const GetNotifications = async (req, res) => {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      const limit = 40;
      let offset = Number(req.query.offset) || 0;
      let userId = authData.user.id;
      //   if(userId == null)
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let admin = await GetTeamAdminFor(user);
      let teamIds = await GetTeamIds(user);
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
            userId: {
              [db.Sequelize.Op.in]: teamIds,
            },
          },
        }
      );

      let nots = await db.NotificationModel.findAll({
        where: {
          type: {
            [db.Sequelize.Op.notIn]: [
              NotificationTypes.NoPaymentAdded,
              NotificationTypes.NoPaymentAiReset,
              NotificationTypes.NoPaymentFoMo,
              NotificationTypes.NoPaymentScarcity,
              NotificationTypes.NoPaymentUrgentWarning,
            ],
          },
          userId: admin.id,
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
  let token = req.body.token;
  console.log("Token ", token);

  // ("cJgxQg0hU9G5GHTL1pCiil:APA91bEZRJCVezaBkZ-1ocMD3G4g6x6R5dxpAmkETW25d9n0Qe4MXXZKkteIkwwKGVv9uQqmIiqy1SRycy587ShsZCS_P5megJSTl8a8w5bOroRn5pZEH3I");
  await sendPushNotification(token, {
    title: req.body.title || "Test Notificaiton",
    body: req.body.body || "This is test notification",
    data: {},
  });
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
    try {
      SendAutoDailyNotificationsFor7Days();
      CheckAndSend7DaysInactivityNotifications();
      CheckAndSendNoPaymentMethodAddedNotifications();
    } catch (error) {}
    // return;
    let date = new Date().toISOString();
    // console.log("Current time server ", date);
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
    // let userIdsNotAlreadySent = [];
    if (notSent && notSent.length > 0) {
      userIds = notSent.map((not) => not.userId);
    }
    let payments = await db.PaymentMethod.findAll();
    let userIdsWithPaymentAdded = [];
    if (payments && payments.length > 0) {
      payments.map((item) => {
        if (!userIdsWithPaymentAdded.includes(item.userId)) {
          userIdsWithPaymentAdded.push(item.userId);
        }
      });
    }

    // for(const id of userIdsWithPaymentAdded){
    //   if(userIdsNotAlreadySent.includes(id)){ // if a user whose payment is added has id in the not already sent
    //     userIds.push(id)
    //   }
    // }

    let users = await db.User.findAll({
      where: {
        [db.Sequelize.Op.and]: [
          // { id: { [db.Sequelize.Op.notIn]: userIds } }, // Exclude these IDs
          { id: { [db.Sequelize.Op.in]: userIdsWithPaymentAdded } }, // Include these IDs
        ],
        userRole: UserRole.AgentX,
      },
    });

    // console.log("Not in", [userIds]);
    // console.log("Inclu", userIdsWithPaymentAdded);

    console.log("Users to send daily notificaitons", users.length);
    // return;
    for (const u of users) {
      let timeZone = u.timeZone || "America/Los_Angeles";
      console.log(`User ${u.id} Time zone is `, timeZone);
      SendNotificationsForNoCalls(u);
      SendNotificationsForNoCalls5Days(u);
      SendFeedbackNotificationsAfter14Days(u);
      SendAppointmentNotifications(u);
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
          SendNotificationsForHotlead(u);
        } else {
          // console.log(
          //   `It's not yet 9 PM in ${timeZone}. Current time: ${timeInUserTimeZone}`
          // );
        }
      }
    }
  } catch (error) {
    console.log("Error in Not Cron ", error);
  }
};

async function SendNotificationsForNoCalls(user) {
  console.log(`Check if send nocall not to ${user.id}`);
  if (user.userRole == UserRole.Invitee) {
    return;
  }
  // console.log("Sending No Calls Not to ", user.id);
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

    const last72Hours = new Date();
    last72Hours.setHours(last72Hours.getHours() - 72);

    // Check user's account creation date
    const userCreatedAt = new Date(user.createdAt);

    // console.log("Sending no calls to", user.id);

    let totalCalls = await db.LeadCallsSent.count({
      where: {
        agentId: {
          [db.Sequelize.Op.in]: ids,
        },
        createdAt: {
          [db.Sequelize.Op.gte]: last72Hours,
        },
      },
    });
    console.log(`Total calls for ${user.id} = ${totalCalls}`);

    if (totalCalls == 0) {
      console.log("Total calls were 0 826 line");

      if (userCreatedAt < last72Hours) {
        console.log("User account was created before 72 horus ", user.id);
        // if userCreatedAt was before 72Hours ago

        //check last NoCallNotification
        let not = await db.NotificationModel.findOne({
          where: {
            userId: user.id,
            type: NotificationTypes.NoCallsIn3Days,
            createdAt: {
              [db.Sequelize.Op.gte]: last72Hours,
            },
          },
        });
        let canSendNewNot = false;
        if (not) {
          console.log(
            "No Calls three days Notification was already sent to ",
            user.id
          );
        } else {
          canSendNewNot = true;
        }
        // console.log("Here ");
        // console.log(totalCalls);
        console.log(canSendNewNot);
        if (totalCalls == 0 && canSendNewNot) {
          // Send "No Calls in 3 days" notification
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
    } else {
      console.log(`More than zero calls for ${user.id}`);
    }
  } catch (error) {
    console.log("Error adding not ", error);
  }
}

async function SendNotificationsForHotlead(user) {
  if (user.userRole == UserRole.Invitee) {
    return;
  }
  console.log("Sending hotlead to ", user.id);
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

    // Check user's account creation date
    const userCreatedAt = new Date(user.createdAt);

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

    // console.log("Sending hotlead to 562", user.id);

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
    console.log(`Calls made by ${user.name} | ${totalCalls}`);
    if (totalCalls >= 1) {
      let not = await db.NotificationModel.findOne({
        where: {
          type: NotificationTypes.CallsMadeByAgent,
          userId: user.id,
          createdAt: {
            [db.Sequelize.Op.gte]: last24Hours,
          },
        },
      });
      if (not) {
        console.log(
          `${NotificationTypes.CallsMadeByAgent} ${not.id} Notification already sent to user ${user.id}`
        );
        return;
      }
      console.log("Sending notification as not already sent", user.id);
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
    } else {
      console.log("Total calls are less than 1");
    }

    if (hotleads > 1) {
      let not = await db.NotificationModel.findOne({
        where: {
          type: NotificationTypes.TotalHotlead,
          userId: user.id,
          createdAt: {
            [db.Sequelize.Op.gte]: last24Hours,
          },
        },
      });
      if (not) {
        console.log(
          `${NotificationTypes.TotalHotlead} Notification already sent to user ${user.id}`
        );
        return;
      }
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
      console.log("Hotleads are less than 1");
    }
  } catch (error) {
    console.log("Error adding not ", error);
  }
}

async function SendAutoDailyNotificationsFor7Days() {
  let date7DaysAgo = new Date();
  date7DaysAgo.setDate(date7DaysAgo.getDate() - 8); // Correctly subtract 7 days from the current date
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
      createdAt: {
        [db.Sequelize.Op.gt]: date7DaysAgo,
      },
      userRole: UserRole.AgentX,
      id: {
        [db.Sequelize.Op.in]: userIds,
      },
    },
  });
  // console.log("Users to send 7 days notificaitons", users.length);

  for (const u of users) {
    let timeZone = u.timeZone || "America/Los_Angeles";
    // console.log("User Time zone is ", timeZone);

    //Check Trial Ticking
    CheckAndSendTrialTickingNotificaitonSent(u);
    CheckAndSendLikelyToWinNotificaitonSent(u);
    CheckAndSendNeedHandNotificaitonSent(u);
    CheckAndSendTrialReminderNotificaitonSent(u);
    CheckAndSendNeedHelpDontMissoutNotificaitonSent(u);
    CheckAndSendLastDayToMakeItCountNotificaitonSent(u);
    // console.log("Sending Last Chance notification to user", u.id);
    CheckAndSendLastChanceToActNotificaitonSent(u);
    CheckAndSendTwoMinuteTrialLeftNotificaitonSent(u);
  }
}

export async function SendDesktopEmail(req, res) {
  JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
    if (authData) {
      let userId = authData.user.id;
      // console.log("User id ", userId);
      let user = await db.User.findOne({
        where: {
          id: userId,
        },
      });
      let type = req.body.type;
      let email = generateDesktopEmail();

      let sent = await SendEmail(user.email, email.subject, email.html);
      res.send({
        status: true,
        message: "Email sent",
      });
    } else {
      return res.send({ status: false, message: "Unauthenticated user" });
    }
  });
}

export async function SendTestEmail(req, res) {
  let type = req.body.type;
  let email = generateDesktopEmail();
  // "Salman Khan",
  // "AgentX12"
  // "Hello",
  // "H",
  // "E",
  // "L",
  // "L"
  // let email = generateMinutesRenewedEmail(
  //   "Salu bhai", // Name
  //   "120", // CTA_Link
  //   "360" // CTA_Text
  // );

  let sent = await SendEmail("salman@e8-labs.com", email.subject, email.html);
  res.send({
    status: true,
    message: "Email sent",
  });
}
NotificationCron();
