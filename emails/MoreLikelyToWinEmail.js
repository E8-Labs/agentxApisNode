const HtmlTemplateThreeTimesWin = `
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
    .bold-link {
      color: #007BFF;
      font-weight: bold;
      text-decoration: none;
    }
    .bold-link:hover {
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
    <div class="header">3x More Likely to Win!</div>
    <div class="body">
      <p>Hi <strong>{First_Name}</strong>,</p>
      <p>Did you know that agents who upload their leads on Day 1 are <strong>3x more likely to book a listing appointment</strong> during their trial?</p>
      <p>Don’t let this opportunity pass you by. The sooner you upload your leads, the sooner you can start generating results.</p>
      <p>
        👉 <a href="{CTA_Link}" class="bold-link"><strong>Upload your leads now and get ahead of the competition!</strong></a>
      </p>
      <p>Let’s get those leads working for you.</p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function GenerateThreeTimesWinEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateThreeTimesWin;

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
    subject: "3x More Likely to Win!",
  };
}
