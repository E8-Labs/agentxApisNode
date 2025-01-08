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
      color: #555;font-size: 14px;
      line-height: 1.6;
    }
    .body p {
      margin: 10px 0;
    }
    .cta {
      display: inline-block;
      margin: 20px 0;
      padding: 12px 24px;
      background-color: #28a745;
      color: #fff;
      text-decoration: none;
      border-radius: 5px;
      font-size: 16px;
    }
    .btnText {
      color: #fff;
      font-size: 16px;
      font-weight: bold;
    }
    .cta:hover {
      background-color: #218838;
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
      <p>Did you know that agents who upload their leads on Day 1 are 3x more likely to book a listing appointment during their trial?</p>
      <p>Don’t let this opportunity pass you by. The sooner you upload your leads, the sooner you can start generating results.</p>
      <p>👉 <strong>Upload your leads now</strong> and get ahead of the competition!</p>
      <p>Let’s get those leads working for you.</p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2023 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function GenerateThreeTimesWinEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateThreeTimesWin;

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
    subject: "3x More Likely to Win!",
  };
}
