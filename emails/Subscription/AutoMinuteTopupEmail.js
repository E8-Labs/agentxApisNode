const HtmlTemplateAutoMinuteTopup = `
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
    display: inline !important;
    margin: 0 !important;
    padding: 0 !important;
    color: #007BFF; /* Ensuring it's blue */
    text-decoration: none; /* Optional: Removes underline */
    font-weight: bold; /* Optional: Keeps it bold */
}

.ctasimple:hover {
    text-decoration: underline; /* Adds underline on hover */
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
    <div class="header">Almost Out of AI Talk Time – More Minutes on the Way!</div>
    <div class="body">
      <p>Hi {First_Name},</p>
      <p>Just a quick update—your AI talk time is down to 5 minutes. No worries! Your minutes will automatically top up so your AgentX AI can continue making calls and engaging with leads without interruption.
</p>
      <p><strong>🔹 What this means for you:</strong><br/>
✅ No downtime—your AI keeps working seamlessly
✅ More conversations, more opportunities
✅ Unused minutes will roll over for future use

</p>

<p>If you’d like to adjust your plan or check your usage, <a href="{CTA_Link}" class="ctasimple"you can manage your settings.</a></p>
      <p>Your AI assistant is always working for you—let’s keep those calls going!</p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateSHtmlTemplateAutoMinuteTopupEmail(
  First_Name,
  CTA_Link,
  CTA_Text
) {
  let emailTemplate = HtmlTemplateAutoMinuteTopup;
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
    subject: "Almost Out of AI Talk Time – More Minutes on the Way!",
  };
}
