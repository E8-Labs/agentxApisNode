import nodemailer from "nodemailer";

export async function SendEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.Mailer_UserName,
      pass: process.env.Mailer_Password,
    },
  });

  const htmlTemplate = html;

  const mailOptions = {
    from: process.env.Mailer_FromEmail,
    to,
    subject,
    html: htmlTemplate,
  };
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Mail sent result ", result);
  } catch (error) {
    console.log("Exception email", error);
    return { status: false, message: "An error occurred" };
  }
}
