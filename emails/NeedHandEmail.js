const HtmlTemplateNeedAHand = `
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
    .cta-link {
      color: #fff;
      color: #007BFF;
      font-weight: bold;
      text-decoration: none;
    }
    .cta-link:hover {
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
    <div class="header">Need a Hand?</div>
    <div class="body">
      <p>Hi {First_Name},</p>
      <p>Missed something in your live training? We’ve got you covered!</p>
      <p>If you didn’t have time to cover everything in onboarding, don’t worry—we’re here to help!</p>
      <p>Agents who complete their setup early unlock the full potential of their AI trial. <span class="bold">Join our live support session</span> to ask questions, get tips, and ensure you’re on the path to success.</p>
      <p>👉 <a href="{CTA_Link}" class="cta-link">Click here to schedule your live session</a></p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateNeedAHandEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateNeedAHand;

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
    subject: "Need a Hand?",
  };
}
