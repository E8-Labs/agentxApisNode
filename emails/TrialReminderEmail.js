const HtmlTemplateTrialReminder = `
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
    .cta {
      display: block;
      margin: 20px auto;
      padding: 12px 24px;
      width: 50%;
      text-align: center;
      background-color: #7902DF;
      color: #FFFFFF;
      text-decoration: none;
      border-radius: 13px;
      font-size: 16px;
      font-weight: bold;
    }
    .cta:hover {
      background-color: #5e02b0;
    }
    .ctaText{
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
    <div class="header">Trial Reminder: Don’t Let It Slip Away!</div>
    <div class="body">
      <p>Hi {First_Name},</p>
      <p>Your trial is moving fast! You have unused trial minutes of AI talk time, and your trial ends soon.</p>
      <p>📈 Agents using their trial talk time are already securing new listing appointments. Don’t let opportunities slip away—start calling today!</p>
      <a href="{CTA_Link}" class="cta"><p class="ctaText">{CTA_Text}</p></a>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateTrialReminderEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateTrialReminder;

  // Replace placeholders with actual values
  const variables = {
    First_Name,
    CTA_Link,
    CTA_Text,
  };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailTemplate = emailTemplate.replace(placeholder, value);
  }

  return {
    html: emailTemplate,
    subject: "Trial Reminder: Don’t Let It Slip Away!",
  };
}
