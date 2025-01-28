const HtmlTemplatePaymentMethodFailed = `
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
    .body ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .body ul li {
      margin: 5px 0;
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
    .btnText{
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
    <div class="header">🚨 Urgent: Payment Method Failed—Action Required</div>
    <div class="body">
      <p>Hi <strong>{Name}</strong>,</p>
      <p>We noticed an issue with your payment method, and your account is currently unable to process calls. To keep your AI up and running, please update your payment details immediately.</p>
      <p>Here’s how to fix it:</p>
      <ul>
        <li>Log in to your account.</li>
        <li>Go to the Billing section.</li>
        <li>Update your payment method.</li>
      </ul>
      <p>Don’t let this delay your progress—agents using AgentX are booking 2-3 listings per month.</p>
      <a href="{CTA_Link}" class="cta"><p class="btnText">{CTA_Text}</p></a>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function GeneratePaymentMethodFailedEmail(Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplatePaymentMethodFailed;
  let parts = Name.split(" ");
  let firstName = Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
  // Replace placeholders with actual values
  const variables = {
    Name: firstName,
    CTA_Link,
    CTA_Text,
  };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailTemplate = emailTemplate.replace(placeholder, value);
  }

  return {
    html: emailTemplate,
    subject: "🚨 Urgent: Payment Method Failed—Action Required",
  };
}
