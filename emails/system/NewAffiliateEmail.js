export function generateAffiliateEmail(First_Name, Affiliate_Link) {
  const emailTemplate = `<!DOCTYPE html>
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
        .affiliate-link {
          display: inline;
          
          color: #333;
          font-size: 16px;
        }
        .highlight {
          font-weight: bold;
          color: #007BFF;
          text-decoration: none;
        }
        .ctaText {
          color: #ffffff
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
        .cta:hover {
          background-color: #7902DF;
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
        <div class="header">🎉 Congrats! Your AgentX Affiliate Link is Live – Start Earning Now! 🚀</div>
        <div class="body">
          <p>Hey ${First_Name},</p>
          <p>Great news—you’re officially an AgentX Affiliate! 🎉</p>
          <p>Your unique referral link is ready to go:</p>
          <p class="affiliate-link">👉<a href="${Affiliate_Link}" class="highlight">${Affiliate_Link}</a></p>
          <p>That means you can start earning commissions immediately by referring businesses to AgentX—helping them automate their sales, qualify leads faster, and close more deals with AI-powered agents.</p>
          
          <p><strong>How You Make Money:</strong></p>
          <ul>
            <li>✅ Earn commission on every paying customer you refer</li>
            <li>✅ Get recurring payouts for the first 12 months of their subscription</li>
            <li>✅ No limits—the more you refer, the more you earn!</li>
          </ul>
  
          <p><strong>🚀 Ready to Start? Here’s How:</strong></p>
          <ol>
            <li>1️⃣ Share your link with your network—real estate agents, insurance brokers, sales teams, and SMBs are loving AgentX.</li>
            <li>2️⃣ Post on LinkedIn, email your contacts, or DM business owners who need automation.</li>
            <li>3️⃣ Start earning! Once they sign up and activate, you get paid.</li>
          </ol>
  
          <p><strong>💡 Pro Tip:</strong> Our top affiliates start earning in their first 24 hours just by sending out a few messages.</p>
  
          <p><strong>🔥 Bonus:</strong> First affiliate to hit <span class="highlight">10 new subscribed accounts this month</span> gets a cash reward!</p>
  
          <p>Your success starts now—don’t wait! Start sharing your link today and watch the commissions roll in. 💰</p>
  
          <a href="${Affiliate_Link}" class="cta"><p class="ctaText">Start Sharing Now</p></a>
          
        </div>
        <div class="footer">
          © 2025 AgentX, All Rights Reserved.
        </div>
      </div>
    </body>
    </html>`;

  return {
    html: emailTemplate,
    subject:
      "🎉 Congrats! Your AgentX Affiliate Link is Live – Start Earning Now! 🚀",
  };
}
