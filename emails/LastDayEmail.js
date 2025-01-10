const HtmlTemplateTrialEndsTonight = `
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
    .bold {
      font-weight: bold;
    }
    .hyperlink {
      color: #007BFF;
      font-weight: bold;
      text-decoration: none;
    }
    .hyperlink:hover {
      text-decoration: underline;
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
    <div class="header">Your Trial Ends Tonight at Midnight ⏰</div>
    <div class="body">
      <p>Hi {First_Name},</p>
      <p>It’s your final chance! Your <span class="bold">30 minutes of AI talk time expire at midnight tonight.</span></p>
      <p>Agents using AgentX are seeing results, with some securing <span class="bold">2-3 listing appointments per month.</span> Don’t miss your opportunity to achieve the same success.</p>
      <p>👉 <a href="{CTA_Link}" class="hyperlink">Start calling your leads now to make your last hours count.</a></p>
      <p>Let’s close out strong!</p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateTrialEndsTonightEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateTrialEndsTonight;

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
    subject: "Your Trial Ends Tonight at Midnight ⏰",
  };
}
