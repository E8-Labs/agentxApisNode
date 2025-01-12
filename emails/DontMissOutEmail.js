const HtmlTemplateTwoDaysLeft = `
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
    <div class="header">Only 2 Days Left to Maximize Your Trial</div>
    <div class="body">
      <p>Hi {First_Name},</p>
      <p>Time is ticking! With only 2 days left in your trial, this is your chance to take action.</p>
      <p>Agents who start early are already seeing results—some booking listings worth <span class="bold">$700k+!</span> If you need help getting started, we’ve got you covered.</p>
      <p>👉 <a href="{CTA_Link}" class="hyperlink">Schedule a live support session</a> to ensure you’re on track to success.</p>
      <p>Don’t let your leads slip away—make the most of your time!</p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateDontMissOutEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateTwoDaysLeft;

  // Replace placeholders with actual values
  let parts = First_Name.split(" ");
  let firstName = First_Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
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
    subject: "Only 2 Days Left to Maximize Your Trial",
  };
}
