const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// `html` is optional — plain-text-only callers (or tests) still work exactly
// as before. When present, it's sent alongside `text` so clients that can't
// render HTML still get a readable email.
async function sendMail(to, subject, text, html) {
  await transporter.sendMail({
    from: `"Haus of Defined Beauty" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}

module.exports = sendMail;
