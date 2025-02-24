export function generateTeamMemberInviteEmail(
  First_Name,
  Inviter_Name,
  CTA_Link = "https://ai.myagentx.com"
) {
  const HtmlTemplateTeamMemberInvite = `
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
          display: inline-block;
          margin: 20px 0;
          padding: 12px 24px;
          background-color: #28a745;
          color: #fff;
          text-decoration: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          text-align: center;
        }
        .cta:hover {
          background-color: #218838;
        }
        .hyperlink {
          color: #007BFF;
          font-weight: bold;
          text-decoration: none;
        }
        .hyperlink:hover {
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
        <div class="header">You’ve Been Invited to Join a Team!</div>
        <div class="body">
          <p>Hi {First_Name},</p>
          <p>{Inviter_Name} has invited you to join their team on AgentX.</p>
          <p>Here’s what you can do as part of the team:</p>
          <ul>
            <li>Collaborate on securing more listings.</li>
            <li>Share and manage leads with ease.</li>
            <li>Track your team’s progress and success.</li>
          </ul>
          <p>👉 <a href="{CTA_Link}" class="hyperlink"><strong>Click here to accept the invitation</strong></a> and get started!</p>
          <p>We’re excited to have you onboard and look forward to seeing your team succeed.</p>
          <p>Best,<br>AgentX Team</p>
        </div>
        <div class="footer">
          © 2025 AgentX, All Rights Reserved.
        </div>
      </div>
    </body>
    </html>
    `;

  // Replace placeholders with actual values
  let emailHTML = HtmlTemplateTeamMemberInvite;
  let parts = First_Name.split(" ");
  let firstName = First_Name;
  if (parts.length > 0) {
    firstName = parts[0];
  }

  let parts2 = Inviter_Name.split(" ");
  if (parts2.length > 0) {
    Inviter_Name = parts2[0];
  }
  const variables = { First_Name: firstName, Inviter_Name, CTA_Link };

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, "g");
    emailHTML = emailHTML.replace(placeholder, value);
  }

  return {
    html: emailHTML,
    subject: `You've Been Invited to Join ${Inviter_Name}'s Team!`,
  };
}
