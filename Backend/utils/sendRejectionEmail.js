const sendEmail = require("./sendEmail");

module.exports = async function sendRejectionEmail({
  to,
  username,
  rejectionReason,
}) {
  const subject = "Educational Assistance Application Rejected";
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SK Insight Educational Assistance Rejection</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background-color: #f4f7fc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 10px;
      padding: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      text-align: center;
      overflow: hidden;
    }
    .header {
      background: #0A2C59;
      color: #fff;
      padding: 32px 0 16px 0;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
    }
    .logo {
      max-width: 120px;
      margin-bottom: 12px;
    }
    h2 {
      color: #fff;
      margin-bottom: 10px;
      font-size: 2rem;
      font-weight: 700;
    }
    .content {
      padding: 32px 40px 24px 40px;
    }
    .reason {
      font-size: 18px;
      font-weight: bold;
      color: #0A2C59;
      margin: 24px 0;
      background: #eaf3fb;
      border-radius: 8px;
      display: inline-block;
      padding: 12px 32px;
      box-shadow: 0 2px 8px rgba(7,176,242,0.07);
    }
    p {
      color: #333;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .footer {
      background: #0A2C59;
      color: #fff;
      font-size: 13px;
      padding: 18px 0;
      border-bottom-left-radius: 10px;
      border-bottom-right-radius: 10px;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img class="logo" src="https://res.cloudinary.com/dnmawrba8/image/upload/v1754197673/logo_no_bg_ycz1nn.png" alt="SK Insight Logo" />
      <h2>Educational Assistance Application Rejected</h2>
    </div>
    <div class="content">
      <p>Dear ${username},</p>
      <p>We regret to inform you that your application for Educational Assistance has been <strong>rejected</strong> for the following reason:</p>
      <div class="reason">${rejectionReason}</div>
      <p>If you have questions, please contact your SK Insight administrator.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} SK Insight. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
  await sendEmail(to, subject, html);
};
