const HtmlTemplateTrialTicking = `
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
      background-color: #7902DF;
      color: #fff;
      text-decoration: none;
      border-radius: 15px;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
    }
    .cta:hover {
      background-color: #5e02b0;
    }
    .ctaText{
      color: #FFFFFF
    }
    .protip-link {
      color: #007BFF;
      text-decoration: none;
      font-weight: bold;
    }
    .protip-link:hover {
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
    <div class="header">Your 30-Minute Trial is Ticking!</div>
    <div class="body">
      <p>Hi {First_Name},</p>
      <p>Welcome to AgentX! Your 7-day trial has started, and your <strong>30 minutes of AI-powered talk time</strong> are ready. Agents who start early see the best results—don’t wait!</p>
      <p>
        👉 <a href="{CTA_Link}" class="protip-link"><strong>Pro Tip:</strong> Upload your leads today and start calling to make the most of your trial.</a>
      </p>
      <p>Your success is our priority—let's make it happen!</p>
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

export function GenerateTrialTickingEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateTrialTicking;

  // Replace placeholders with actual values
  let parts = First_Name.split(" ");
  let firstName = First_Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
  const variables = {
    firstName,
    CTA_Link,
    CTA_Text,
  };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailTemplate = emailTemplate.replace(placeholder, value);
  }

  return {
    html: emailTemplate,
    subject: "Your 30-Minute Trial is Ticking!",
  };
}
