export function generatePlanUpgradeEmail(Name, CTA_Link, CTA_Text) {
  const HtmlTemplateInactive5Days = `
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
              background-color: #7902DF;
              color: #fff;
              text-decoration: none;
              border-radius: 25px;
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              width: 50%;
            }
            .ctaText{
              color: #FFFFFF
            }
            .cta:hover {
              background-color: #218838;
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
            <div class="header">Upgrade and Save!</div>
            <div class="body">
              <p>Hi {Name},</p>
              <p>You’re currently on the 30 min plan. By upgrading to 120 mins, you’ll save 40% on your calling costs.</p>
              <p>Keep the momentum going and make the most of your AI sales system. Upgrade now and watch the results roll in!.</p>
              
              <a href="{CTA_Link}" class="cta"><p class="ctaText">{CTA_Text}</p></a>
            </div>
            <div class="footer">
              © 2025 AgentX, All Rights Reserved.
            </div>
          </div>
        </body>
        </html>
        `;

  return {
    html: HtmlTemplateInactive5Days.replace("{Name}", Name)
      .replace("{CTA_Link}", CTA_Link)
      .replace("{CTA_Text}", CTA_Text),
    subject: "Upgrade and Save!",
  };
}
