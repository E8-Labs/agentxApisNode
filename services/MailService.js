import nodemailer from "nodemailer";
import db from "../models/index.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import { AddNotification } from "../controllers/NotificationController.js";
import { generateFailedSubscriptionEmail } from "../emails/system/FailedSubscriptionEmail.js";
import { constants } from "../constants/constants.js";

const transporter = nodemailer.createTransport({
  pool: true,
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.Mailer_UserName,
    pass: process.env.Mailer_Password,
  },
  maxConnections: 5,
  maxMessages: 100,
});

export async function SendEmail(to, subject, html) {
  const mailOptions = {
    from: process.env.Mailer_FromEmail,
    to,
    subject,
    html,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    // console.log("Mail sent result:", result);
    return { status: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Exception email:", error);
    return { status: false, message: "An error occurred" };
  }
}

export async function SendPaymentFailedNotification(user) {
  try {
    const date1MonthAgo = new Date();
    date1MonthAgo.setDate(date1MonthAgo.getDate() - 30);

    const date3DaysAgo = new Date();
    date3DaysAgo.setDate(date3DaysAgo.getDate() - 3);

    // Step 1: Check total notifications sent in the past month
    const totalNotsIn1Month = await db.NotificationModel.count({
      where: {
        userId: user.id,
        type: NotificationTypes.PaymentFailed,
        createdAt: {
          [db.Sequelize.Op.gte]: date1MonthAgo,
        },
      },
    });

    // If the user has already received 2 notifications, stop
    if (totalNotsIn1Month >= 2) {
      console.log("Notification already sent twice in the past month.");
      return;
    }

    // Step 2: Check if a notification was sent in the last 3 days
    const recentNotification = await db.NotificationModel.findOne({
      where: {
        userId: user.id,
        type: NotificationTypes.PaymentFailed,
        createdAt: {
          [db.Sequelize.Op.gte]: date3DaysAgo,
        },
      },
    });

    if (recentNotification) {
      console.log("Notification already sent in the last 3 days.");
      return;
    }

    // Step 3: Send the notification
    console.log("Sending payment failed notification.");
    await AddNotification(
      user,
      null,
      NotificationTypes.PaymentFailed,
      null,
      null,
      null
    );

    console.log("Notification sent successfully.");
  } catch (error) {
    console.log("Error creating payment notification:", error);
  }
}

export async function SendSubscriptionFailedEmail(
  user,
  plan,
  failureReason,
  charge
) {
  try {
    let emailNot = generateFailedSubscriptionEmail(
      user.id,
      user.name,
      user.email,
      user.phone,
      plan.type,
      failureReason,
      JSON.stringify({ charge: charge })
    );

    let sent = await SendEmail(
      constants.AdminNotifyEmail1,
      emailNot.subject,
      emailNot.html
    );
    let sent2 = await SendEmail(
      constants.AdminNotifyEmail2,
      emailNot.subject,
      emailNot.html
    );
  } catch (error) {
    console.log("Error sending transaction email");
  }
}
