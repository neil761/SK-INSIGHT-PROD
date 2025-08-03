module.exports = function getResetPasswordEmail(resetUrl) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Reset Your Password - SK Insight</title>
    <style>
      body {
        background-color: #f1f3f7;
        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 12px;
        padding: 40px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .header h1 {
        color: #0A2C59;
        font-size: 28px;
        margin: 0;
      }
      .content p {
        font-size: 16px;
        color: #333333;
        line-height: 1.6;
        margin: 16px 0;
      }
      .button {
        display: inline-block;
        background-color: #0A2C59;
        color: #ffffff !important;
        text-decoration: none;
        padding: 14px 28px;
        margin: 20px 0;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
      }
      .footer {
        margin-top: 40px;
        text-align: center;
        font-size: 12px;
        color: #777777;
      }
      .sk-logo {
        width: 60px;
        margin-bottom: 10px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <img src="https://res.cloudinary.com/dnmawrba8/image/upload/v1754197673/logo_no_bg_ycz1nn.png" alt="SK Insight Logo" class="sk-logo" />
        <h1>SK Insight</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>You requested to reset your password. Click the button below to create a new one:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>If you didn't make this request, you can safely ignore this message. This link will expire in 30 minutes.</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} SK Insight. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};
