const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendMail(to, subject, text) {
  await transporter.sendMail({
    from: `"Haus of Defined Beauty" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
  });
}

module.exports = sendMail;
