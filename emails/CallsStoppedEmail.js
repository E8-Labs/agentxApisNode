const HtmlTemplateCallsStopped = `
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
    .ctaText{
      color: #FFFFFF
    }
    .btnText {
      color: #fff;
      font-size: 16px;
      font-weight: bold;
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
    <div class="header">📞 Your Calls Have Stopped—Let’s Get Back on Track!</div>
    <div class="body">
      <p>Hi <strong>{Name}</strong>,</p>
      <p>We noticed your AI hasn’t made any calls for 3 days. Is everything okay? Don’t worry, we’re here to help you get back on track.</p>
      <p>Join our live webinar to learn how to:</p>
      <ul>
        <li>Optimize your AI’s performance.</li>
        <li>Upload new leads.</li>
        <li>Secure more listing appointments.</li>
      </ul>
      <p>Agents who attend our webinars see a 5x increase in success.</p>
      <a href="{CTA_Link}" class="cta"><p class="btnText">{CTA_Text}</p></a>
    </div>
    <div class="footer">
      © 2023 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function GenerateCallsStoppedEmail(Name, CTA_Link, CTA_Text) {
  let emailTemplate = HtmlTemplateCallsStopped;

  // Replace placeholders with actual values
  let parts = Name.split(" ");
  let firstName = Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
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
    subject: "📞 Your Calls Have Stopped—Let’s Get Back on Track!",
  };
}
