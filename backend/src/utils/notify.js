const sendMail = require('./mailer');
const { wrapEmail } = require('./emailTemplates');

// `headerKey` picks which branded banner tops the HTML email — 'otp',
// 'booking' or 'reminder' (see emailTemplates.js); defaults to the general
// booking banner for call sites that don't specify one.
//
// Never throws — a failed notification (e.g. an admin's FYI email) shouldn't
// block whatever real action already succeeded. Returns true/false instead
// so a caller for whom the email *is* the whole point (e.g. an OTP) can still
// check it and tell the user to try again.
async function notify(email, message, subject = 'Haus of Defined Beauty', headerKey) {
  if (!email) {
    console.warn('[NOTIFY] no email on file, skipped:', message);
    return false;
  }
  try {
    await sendMail(email, subject, message, wrapEmail(message, headerKey));
    return true;
  } catch (err) {
    console.error('[NOTIFY] email send failed:', err.message);
    return false;
  }
}

module.exports = notify;
