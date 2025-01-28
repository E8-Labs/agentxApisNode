import nodemailer from "nodemailer";
import db from "../models/index.js";
import { NotificationTypes } from "../models/user/NotificationModel.js";
import { AddNotification } from "../controllers/NotificationController.js";

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
    // let user = await db.User.findByPk(userId);
    //Check if can send
    let date1MonthAgo = new Date();
    date1MonthAgo.setDate(date1MonthAgo.getDate() - 30);
    let sent = await db.NotificationModel.findOne({
      where: {
        userId: user.id,
        type: NotificationTypes.PaymentFailed,
        createdAt: {
          [db.Sequelize.Op.gte]: date1MonthAgo,
        },
      },
    });
    if (sent) {
      console.log(
        "Payment failed notification already sent on ",
        sent.createdAt
      );
      return;
    }

    console.log("Should send payment failed notification");
    await AddNotification(
      user,
      null,
      NotificationTypes.PaymentFailed,
      null,
      null,
      null
    );
  } catch (error) {
    console.log("Error creating payment not ", error);
  }
}
