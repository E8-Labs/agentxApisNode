const HtmlTemplateHotLeadAlert = `
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
    <div class="header">🔥 New Hot Lead Alert: {Leadname}</div>
    <div class="body">
      <p>Hi <strong>{Name}</strong>,</p>
      <p>Exciting news—your AI has identified a hot lead!</p>
      <p>Here are the details:</p>
      <ul>
        <li><strong>Name:</strong> {Leadname}</li>
        <li><strong>Email:</strong> {Leademail}</li>
        <li><strong>Phone:</strong> {Leadphone}</li>
        <li><strong>Call Recording:</strong> <a href="{LinkToRecording}" style="color: #007BFF; text-decoration: none;">Link to Recording</a></li>
      </ul>
      <p>This is your opportunity to follow up and close the deal.</p>
      <a href="{CTA_Link}" class="cta"><p class="ctaText">{CTA_Text}</p></a>
    </div>
    <div class="footer">
      © 2023 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>

`;

export function GenerateHotLeadEmail(
  Name,
  Leadname,
  Leademail,
  Leadphone,
  LinkToRecording,
  CTA_Link,
  CTA_Text
) {
  let emailTemplate = HtmlTemplateHotLeadAlert;

  // Replace placeholders with actual values
  const variables = {
    Name,
    Leadname,
    Leademail,
    Leadphone,
    LinkToRecording,
    CTA_Link,
    CTA_Text,
  };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailTemplate = emailTemplate.replace(placeholder, value);
  }

  return {
    html: emailTemplate,
    subject: `🔥 New Hot Lead Alert: ${Leadname}`,
  };
}
