export function generateFomoEmail(Name, Same_City, CTA_Link, CTA_Text) {
  const HtmlTemplateSameCitySuccess = `
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
  background-color: #7902DF; /* Button background color */
  text-decoration: none; /* Removes underline from the link */
  border-radius: 25px; /* Rounded button */
  text-align: center;
  width: 50%; /* Button width */
}

.ctaText {
  color: #ffffff !important; /* Ensures text is white */
  margin: 0; /* Removes any margin from <p> */
  font-size: 16px; /* Font size for text */
  font-weight: bold; /* Bold text */
  text-align: center; /* Center-aligns the text */
}

.cta:hover {
  background-color: #7902DF; /* Darker green on hover */
}

.cta:hover .ctaText {
  color: #ffffff !important; /* Keeps text white on hover */
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
          <div class="header">4 listing appointments secured near you!</div>
          <div class="body">
            <p>Hi {Name},</p>
            <p>In the last 2 weeks, 4 listing appointments have been secured around {Same_City}. The market is active, and other agents are making moves.</p>
            <p>Don’t miss out on your opportunity to dominate your area. Activate your AI today and start making calls!</p>
            <a href="{CTA_Link}" class="cta">
  <p class="ctaText">{CTA_Text}</p>
</a>
          </div>
          <div class="footer">
            © 2025 AgentX, All Rights Reserved.
          </div>
        </div>
      </body>
      </html>
      `;

  return {
    html: HtmlTemplateSameCitySuccess.replace("{Name}", Name)
      .replace("{Same_City}", Same_City)
      .replace("{CTA_Link}", CTA_Link)
      .replace("{CTA_Text}", CTA_Text),
    subject: "4 listing appointments secured near you!",
  };
}
