export function generateDesktopEmail() {
  const HtmlTemplateFeedbackWithSenderDetails = `
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
            .sender-details {
              display: flex;
              align-items: center;
              margin: 20px 0;
            }
            .profile-image {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background-color: #000;
              color: #fff;
              font-size: 18px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 15px;
              text-transform: uppercase;
              
            }
            .feedback-box {
              background-color: #f9f9f9;
              border-left: 4px solid #7902DF;
              margin: 10px 0;
              padding: 15px;
              border-radius: 4px;
              color: #333;
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
            <div class="header">Welcome to AgentX! Continue on Desktop</div>
            <div class="body">
              <p>Hi Visionary,</p>
              <p>Welcome to <strong>AgentX</strong>, where we redefine what’s possible in real estate. You’ve just taken the first step toward building your own AI—a tool so powerful, it could reshape how you connect, communicate, and close deals.</p>
              <p>But here’s the thing: creating something extraordinary requires the right tools. While mobile is great for quick actions, building your AI masterpiece requires a bigger canvas—your desktop. Think of it as trying to craft a skyscraper on a smartphone. You need the space to see every detail and the power to bring it to life.
Why? Because building an AI isn’t just about pressing buttons. It’s about precision, vision, and a little bit of magic. At AgentX, we’ve optimized this transformative experience for desktop, ensuring every detail works seamlessly as you design the future of your business.
</p>
            <p>Click below to pick up right where you left off:</p>
              <p>👉 <b><a href="ai.myagentx.com/createagent" class="hyperlink">Continue Building Your AI</a><b></p>
              
              <p>The future doesn’t wait. The tools are here. The question is: how will you use them?</p>
              <p>Welcome to the revolution. Let’s get to work.</p>
              <p>With admiration for your vision,</p>
              <p>The AgentX Team</p>
              <p>P.S. "Simple can be harder than complex: you have to work hard to get your thinking clean to make it simple. But it’s worth it in the end because once you get there, you can move mountains.”</p>
              <p> – Steve Jobs</p>
            </div>
            <div class="footer">
              © 2025 AgentX, All Rights Reserved.
            </div>
          </div>
        </body>
        </html>
        `;

  return {
    subject: "Welcome to AgentX! Continue on Desktop",
    html: HtmlTemplateFeedbackWithSenderDetails,
  };
}
