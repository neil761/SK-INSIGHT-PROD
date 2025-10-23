const nodemailer = require('nodemailer');
require('dotenv').config();

const otpTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_OTP_USER,
    pass: process.env.GMAIL_OTP_PASS
  },
  port: 587,
  secure: false
});

module.exports = otpTransporter;