export function generateFailedTwilioTransactionEmail(
  Sender_Id,
  Sender_Name,
  Sender_Email,
  Sender_Phone,
  PhoneNumberPurchased,
  StripeChargeId,
  MoreData
) {
  const initials = Sender_Name.split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  const profileImageStyle = Profile_Image
    ? `background-image: url('${Profile_Image}');`
    : "";

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
            <div class="header">Plan Cancellation Feedback</div>
            <div class="body">
              <p>Hi Admin,</p>
              <p>There is a failed transaction while purchasing a phone number from twilio for ${Sender_Name}:</p>
              <div class="sender-details">
                
                <div>
                  <p>${Sender_Id}</p>
                  <p><strong>${Sender_Name}</strong></p>
                  <p>${Sender_Email}</p>
                  <p>${Sender_Phone}</p>
                </div>
              </div>
              <p><strong>Transaction Details:</strong></p>
              <div class="feedback-box">
                <strong>Stripe Transaction ID:</strong>${StripeChargeId}

                <strong>Phone Number Purchased:</strong>${PhoneNumberPurchased}

                <strong>Additional Data</strong>${MoreData}

              </div>
              <p>Best Regards,<br>AgentX</p>
            </div>
            <div class="footer">
              © 2025 AgentX, All Rights Reserved.
            </div>
          </div>
        </body>
        </html>
        `;

  return {
    subject: "Phone Purchase Failure",
    html: HtmlTemplateFeedbackWithSenderDetails,
  };
}
