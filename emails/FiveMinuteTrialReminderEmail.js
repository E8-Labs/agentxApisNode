const HtmlTemplateTwoMinutesLeft = `
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
    .cta {
      display: block;
      margin: 20px auto;
      padding: 12px 24px;
      width: 50%;
      background-color: #7902DF;
      color: #fff;
      text-decoration: none;
      border-radius: 12px;
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
    <div class="header">Just 5 Minutes Left on Your Trial!</div>
    <div class="body">
      <p>Hi {First_Name},</p>
      <p>Your 30-minute trial is almost up—you’ve got just <span class="bold">5 minutes</span> left to make the most of it!</p>
      <p>Your plan will <span class="bold">automatically renew</span> at your selected level from our pay-as-you-go plans, so you can keep calling without interruption.</p>
      <p>👉 <a href="{CTA_Link}" class="hyperlink"><span class="bold">Want to adjust your plan?</span></a> Visit your account now to make any changes before your minutes renew.</p>
      <p>Stay connected and keep the momentum going—your next listing appointment is just a call away!</p>
      <a href="{CTA_Link}" class="cta"><p class="ctaText">{CTA_Text}</p></a>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateFiveMinutesLeftEmail(First_Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateTwoMinutesLeft;

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
    subject: "Just 5 Minutes Left on Your Trial!",
  };
}
