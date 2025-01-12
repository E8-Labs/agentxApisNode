const HtmlTemplateMinutesRenewed = `
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
    <div class="header"><strong>{Minutes} minutes</strong> have been renewed! 🎉</div>
    <div class="body">
      <p>Hi <strong>{First_Name}</strong>,</p>
      <p>Your plan has been renewed, and <strong>{Minutes} minutes</strong> have been added to your account for <strong>\${Price}</strong>. You’re all set to continue making calls and booking opportunities.</p>
      <p>Best,<br>AgentX Team</p>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>
`;

export function generateMinutesRenewedEmail(First_Name, Minutes, Price) {
  let emailTemplate = HtmlTemplateMinutesRenewed;

  let parts = First_Name.split(" ");
  let firstName = First_Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
  // Replace placeholders with actual values
  const variables = {
    First_Name: firstName,
    Minutes,
    Price,
  };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailTemplate = emailTemplate.replace(placeholder, value);
  }

  return {
    html: emailTemplate,
    subject: `${Minutes} minutes have been renewed! 🎉`,
  };
}
