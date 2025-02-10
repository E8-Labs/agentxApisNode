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
    <div class="header">💰Agents Are Closing $700K+ Deals—Your AI is Waiting!</div>
    <div class="body">
      <p>Hi {Name},</p>
      <p>Your AI assistant is sitting idle, waiting to <strong>prospect and book appointments for you</strong>—but it hasn’t been activated yet. Time is Money—Let Your AI Start Working for You!"
</p>
      <p>⏳ <strong>Every day you wait = lost opportunities.</strong></p>
      
      <p><strong>Why wait?</strong> Agents using AgentX are closing deals faster than ever.</p>
      <p>Agents who activate their AI <strong>book appointments 5x faster</strong> than those who don’t.</p>
      <p><strong>Ready to start finding deals?</strong></p>
      <a href="{CTA_Link}" class="cta"><p class="btnText">{CTA_Text}</p></a>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function GenerateNoPaymentFoMoEmail(Name, CTA_Link, CTA_Text) {
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
    subject: "Your AI is Waiting to Work for You!",
  };
}
