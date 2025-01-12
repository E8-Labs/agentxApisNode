const HtmlTemplateAgentXCodeUsage = `
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
    .btnText{
      color: #fff
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
    <div class="header">🎉 You’ve Just Earned 30 More Minutes!</div>
    <div class="body">
      <p>Hi <strong>{Name}</strong>,</p>
      <p>Congratulations! You’ve just unlocked 30 additional minutes of AI talk time using your Agent Code: <strong>{Agent_Code}</strong>.</p>
      <p>Here’s how you can make the most of it:</p>
      <ul>
        <li>Upload new leads to start booking listing appointments.</li>
        <li>Watch your AI in action as it prospects for you.</li>
        <li>Don’t wait—success starts now!</li>
      </ul>
      <a href="https://ai.myagentx.com/dashboard/leads" class="cta"><p class="btnText">Upload Leads and Start Calling</p></a>
    </div>
    <div class="footer">
      © 2023 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>

`;

export function GetAgentXCodeUsageEmailReplacedVariables(Name, Code) {
  // Replace placeholders with actual values
  let parts = Name.split(" ");
  let firstName = Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }
  let t = HtmlTemplateAgentXCodeUsage;
  t = t.replace(/{Agent_Code}/g, Code);
  t = t.replace(/{Name}/g, firstName);
  return { html: t, subject: "🎉 You’ve Just Earned 30 More Minutes!" };
}
