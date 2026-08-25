const sendMail = require('./mailer');

async function notify(email, message) {
  if (!email) {
    console.warn('[NOTIFY] no email on file, skipped:', message);
    return;
  }
  try {
    await sendMail(email, 'Haus of Defined Beauty', message);
  } catch (err) {
    console.error('[NOTIFY] email send failed:', err.message);
  }
}

module.exports = notify;
