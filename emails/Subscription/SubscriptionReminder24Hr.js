const HtmlTemplateSubscriptionReminder = `
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
    .ctasimple {
        display: block;
      margin: 20px auto;
      padding: 12px 24px;
      width: 50%;
      text-align: center;
      
      color:rgb(144, 173, 232);
      text-decoration: none;
      font-size: 16px;
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
      <p>Just a quick heads-up—your AgentX subscription is set to renew soon. To ensure uninterrupted access to your AI-powered sales assistant, no action is needed if your payment details are up to date.
With this renewal, you’ll receive additional AI talk time, and any unused minutes will roll over—ensuring you maximize every conversation.
</p>
      <p>Here’s what you get with your renewal:<br/>
✅ Seamless AI-driven prospecting & follow-ups<br/>
✅ More booked meetings & qualified leads<br/>
✅ Continuous feature updates & improvements<br/>
✅ Rollover minutes to keep your AI working at full capacity
</p>

<p>If you have any questions or need to update your billing details, <a  href="{CTA_Link}" class="ctasimple">you can manage your subscription here.</a></p>
      <p>We appreciate your trust in AgentX and look forward to helping you scale your business even further!</p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateSubscriptionReminderEmail(
  First_Name,
  CTA_Link,
  CTA_Text
) {
  let emailTemplate = HtmlTemplateSubscriptionReminder;
  let parts = First_Name.split(" ");
  let firstName = First_Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
  // Replace placeholders with actual values
  const variables = {
    First_Name: firstName,
    CTA_Link,
    CTA_Text,
  };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailTemplate = emailTemplate.replace(placeholder, value);
  }

  return {
    html: emailTemplate,
    subject: "our AgentX Subscription Will Renew Soon",
  };
}
