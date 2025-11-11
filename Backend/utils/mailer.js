const nodemailer = require('nodemailer');
require('dotenv').config();

const otpTransporter = nodemailer.createTransport({
  host: process.env.HOSTINGER_SMTP_HOST,
  port: Number(process.env.HOSTINGER_SMTP_PORT),
  secure: true, // <-- must be true for port 465
  auth: {
    user: process.env.HOSTINGER_SMTP_USER,
    pass: process.env.HOSTINGER_SMTP_PASS
  }
});

module.exports = otpTransporter;