const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
  host: process.env.HOSTINGER_SMTP_HOST,
  port: Number(process.env.HOSTINGER_SMTP_PORT),
  secure: true, // <-- must be true for port 465
  auth: {
    user: process.env.HOSTINGER_SMTP_USER,
    pass: process.env.HOSTINGER_SMTP_PASS
    },
  });

  await transporter.sendMail({
    from: `"SK Insight" <${process.env.HOSTINGER_SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
