const mailer = require('./utils/mailer');

mailer.sendMail({
  from: '"SK Insight" <putingbatowestsk@sk-insight.online>',
  to: 'andreicomia7@gmail.com', // <-- use your own email for testing
  subject: 'Test Hostinger SMTP',
  text: 'This is a test email from Hostinger SMTP.'
}).then(() => {
  console.log('Email sent!');
}).catch(err => {
  console.error('Error:', err);
});