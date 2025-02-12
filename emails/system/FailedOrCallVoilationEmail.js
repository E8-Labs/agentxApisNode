export function generateFailedOrCallVoilationEmail(
  data,
  title = "Call Failure Notification"
) {
  console.log("Data Email", data);
  const { Sender_Name, FailureReason } = data;
  let otherDetails = data.otherDetails;

  const initials = Sender_Name
    ? Sender_Name.split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
    : "?";

  const detailsHtml = Object.entries(otherDetails)
    .map(
      ([key, value]) =>
        `<p><strong>${key.replace(/_/g, " ")}:</strong> ${value}</p>`
    )
    .join("\n");

  console.log("Html is ", otherDetails);

  let subtitle = `There was a violation call by ${Sender_Name}`;
  if (title == "Non Responsive Agent Notification") {
    subtitle = `Non responseive ai in a call by ${Sender_Name}`;
  } else if (title == "Non Responsive Agent Notification") {
    subtitle = `There was a violation call by ${Sender_Name}`;
  }

  const HtmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background-color: #7902DF;
            color: #fff;
            text-align: center;
            padding: 20px;
            font-size: 24px;
            font-weight: bold;
          }
          .body {
            padding: 20px;
            color: #555;
            font-size: 14px;
            line-height: 1.6;
          }
          .body p {
            margin: 10px 0;
          }
          .feedback-box {
            background-color: #f9f9f9;
            border-left: 4px solid #7902DF;
            margin: 10px 0;
            padding: 15px;
            border-radius: 4px;
            color: #333;
          }
          .footer {
            text-align: center;
            background-color: #f4f4f4;
            padding: 10px;
            font-size: 12px;
            color: #aaa;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">${title}</div>
          <div class="body">
            <p>Hi Admin,</p>
            <p>${subtitle}</strong>:</p>
            <div class="feedback-box">
              <p><strong>Reason:</strong> ${FailureReason}</p>
              
            </div>
            <p><strong>Other Details:</strong></p>
            <div class="feedback-box">
              ${detailsHtml}
            </div>
            <p>Best Regards,<br>AgentX</p>
          </div>
          <div class="footer">
            © 2025 AgentX, All Rights Reserved.
          </div>
        </div>
      </body>
      </html>
    `;

  return {
    subject: FailureReason,
    html: HtmlTemplate,
  };
}
