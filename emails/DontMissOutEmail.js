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
    <div class="header">Only 2 Days Left to Maximize Your Trial</div>
    <div class="body">
      <p>Hi <strong>{First_Name}</strong>,</p>
      <p>Time is ticking! With only 2 days left in your trial, this is your chance to take action.</p>
      <p>Agents who start early are already seeing results—some booking listings worth $700k+! If you need help getting started, we’ve got you covered.</p>
      <p>👉 <strong>Schedule a live support session</strong> to ensure you’re on track to success.</p>
      <p>Don’t let your leads slip away—make the most of your time!</p>
      <a href="{CTA_Link}" class="cta"><p class="btnText">{CTA_Text}</p></a>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2023 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateDontMissOutEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateTwoDaysLeft;

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
    subject: "Only 2 Days Left to Maximize Your Trial",
  };
}
