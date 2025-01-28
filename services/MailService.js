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

// export async function SendPaymentFailedNotification(user) {
//   try {
//     // let user = await db.User.findByPk(userId);
//     //Check if can send
//     let date1MonthAgo = new Date();
//     date1MonthAgo.setDate(date1MonthAgo.getDate() - 30);

//     let date3DaysAgo = new Date();
//     date3DaysAgo.setDate(date3DaysAgo.getDate() - 3);

//     let date6DaysAgo = new Date();
//     date6DaysAgo.setDate(date6DaysAgo.getDate() - 6);

//     let totalNotsIn6Days = await db.NotificationModel.count({
//       where: {
//         userId: user.id,
//         type: NotificationTypes.PaymentFailed,
//         createdAt: {
//           [db.Sequelize.Op.gte]: date6DaysAgo,
//         },
//       },
//     });
//     if (totalNotsIn6Days >= 2) {
//       //Don't send any notification
//     } else {
//       let totalNotsIn3Days = await db.NotificationModel.count({
//         where: {
//           userId: user.id,
//           type: NotificationTypes.PaymentFailed,
//           createdAt: {
//             [db.Sequelize.Op.gte]: date3DaysAgo,
//           },
//         },
//       });
//     }

//     let sent = await db.NotificationModel.findOne({
//       where: {
//         userId: user.id,
//         type: NotificationTypes.PaymentFailed,
//         createdAt: {
//           [db.Sequelize.Op.gte]: date1MonthAgo,
//         },
//       },
//     });
//     if (sent) {
//       console.log(
//         "Payment failed notification already sent on ",
//         sent.createdAt
//       );
//       return;
//     }

//     console.log("Should send payment failed notification");
//     await AddNotification(
//       user,
//       null,
//       NotificationTypes.PaymentFailed,
//       null,
//       null,
//       null
//     );
//   } catch (error) {
//     console.log("Error creating payment not ", error);
//   }
// }
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
