const HtmlTemplateMeetingBooked = `
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
      color: #555;font-size: 14px;
      line-height: 1.6;
    }
    .body p {
      margin: 10px 0;
    }
    .cta {
      display: block;
      margin: 20px auto;
      padding: 12px 24px;
      width: 50%;
      background-color: #7902DF;
      color: #fff;
      text-decoration: none;
      border-radius: 15px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
    }
    .cta:hover {
      background-color: #5e02b0;
    }
    .btnText{
      color: #FFFFFF
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
    <div class="header">🗓️ Meeting Booked: {Leadname}</div>
    <div class="body">
      <p>Hi {Name},</p>
      <p>Exciting news! <strong>{Leadname}</strong> has just booked a meeting. This is a perfect opportunity to make progress toward closing the deal.</p>
      <p>Here’s the meeting summary:</p>
      <ul>
        <li><strong>Name:</strong> {Leadname}</li>
        <li><strong>Email:</strong> {Leademail}</li>
        <li><strong>Phone:</strong> {Leadphone}</li>
        <li><strong>Call Recording:</strong> <a href="{LinkToRecording}" style="color: #007BFF; text-decoration: none;">Listen to recording</a></li>
        <li><strong>Date and Time:</strong> {MeetingDateTime}</li>
      </ul>
      <p>Don’t miss this chance to make an impact.</p>
      <a href="{CTA_Link}" class="cta"><p class="btnText">{CTA_Text}</p></a>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function GenerateMeetingBookedEmail(
  Name,
  Leadname,
  Leademail,
  Leadphone,
  LinkToRecording,
  MeetingDateTime,
  CTA_Link,
  CTA_Text
) {
  let emailTemplate = HtmlTemplateMeetingBooked;

  let parts = Name.split(" ");
  let firstName = Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
  // Replace placeholders with actual values
  const variables = {
    Name: firstName,
    Leadname,
    Leademail,
    Leadphone,
    LinkToRecording,
    MeetingDateTime,
    CTA_Link,
    CTA_Text,
  };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailTemplate = emailTemplate.replace(placeholder, value);
  }

  return {
    html: emailTemplate,
    subject: `🗓️ Meeting Booked: ${Leadname}`,
  };
}
