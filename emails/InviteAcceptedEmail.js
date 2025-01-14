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
    <div class="header">{Teamname} joined AgentX!</div>
    <div class="body">
      <p>Hi {Name},</p>
      <p>Great news! Your team, <strong>{Teamname}</strong>, has officially joined AgentX.</p>
      <p>What’s next?</p>
      <ul>
        <li>Share leads with your team members.</li>
        <li>Collaborate on securing more listings.</li>
        <li>Watch your team’s success grow.</li>
      </ul>
      <p>Let’s get started on building your pipeline together!</p>
      <a href="https://ai.myagentx.com/dashboard/teams" class="cta"><p class="btnText">View your Team Dashboard</p></a>
    </div>
    <div class="footer">
      © 2025 AgentX, All Rights Reserved.
    </div>
  </div>
</body>
</html>

`;

export function GetInviteAcceptedEmailReplacedVariables(Name, Teamname) {
  let t = HtmlTemplateAgentXCodeUsage;

  let parts = Name.split(" ");
  let firstName = Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }

  t = t.replace(/{Teamname}/g, Teamname);
  t = t.replace(/{Name}/g, firstName);
  return { html: t, subject: ` ${Teamname} joined AgentX` };
}
