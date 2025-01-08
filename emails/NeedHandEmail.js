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
    <div class="header">Need a Hand?</div>
    <div class="body">
      <p>Hi <strong>{First_Name}</strong>,</p>
      <p>Missed something in your live training? We’ve got you covered!</p>
      <p>If you didn’t have time to cover everything in onboarding, don’t worry—we’re here to help!</p>
      <p>Agents who complete their setup early unlock the full potential of their AI trial. Join our live support session to ask questions, get tips, and ensure you’re on the path to success.</p>
      <p>👉 <a href="{CTA_Link}" class="cta"><p class="btnText">{CTA_Text}</p></a></p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2023 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateNeedAHandEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateNeedAHand;

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
    subject: "Need a Hand?",
  };
}
