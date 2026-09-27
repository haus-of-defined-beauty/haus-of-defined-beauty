// Shared branded wrapper for every outgoing email: a header image at the top
// (one of three, per email purpose) and a consistent "get in touch" footer,
// matching the site's own charcoal/gold theme (see
// frontend/src/Site/Site.css --charcoal / --gold) and its real contact
// details (see frontend/src/Site/SiteFooter.js).
const WEBSITE_URL = process.env.FRONTEND_URL || 'https://haus-of-defined-beauty.vercel.app';
const WHATSAPP_NUMBER = '27814002859'; // +27 81 400 2859
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const WHATSAPP_LABEL = '+27 81 400 2859';

// Served from the frontend's /public/email folder, not imported via webpack —
// an email client loads it over plain HTTPS, so each needs a stable, unhashed
// path that survives every rebuild. Each key is a `headerKey` passed to
// notify()/wrapEmail() below; override any one with the matching env var if
// an image ever needs to live somewhere else.
const HEADER_IMAGES = {
  otp: process.env.EMAIL_HEADER_OTP_URL || `${WEBSITE_URL}/email/header-otp.jpg`,
  booking: process.env.EMAIL_HEADER_BOOKING_URL || `${WEBSITE_URL}/email/header-booking.jpg`,
  reminder: process.env.EMAIL_HEADER_REMINDER_URL || `${WEBSITE_URL}/email/header-reminder.jpg`,
};
const DEFAULT_HEADER_KEY = 'booking';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Turns a plain-text message into the salon's branded HTML email. Kept simple
// and table-based (inline styles only) since that's what actually renders
// consistently across Gmail/Outlook/Apple Mail. `headerKey` picks which of
// the three banners (see HEADER_IMAGES) tops the email; unknown/missing keys
// fall back to the general booking banner rather than breaking the send.
function wrapEmail(message, headerKey = DEFAULT_HEADER_KEY) {
  const headerImage = HEADER_IMAGES[headerKey] || HEADER_IMAGES[DEFAULT_HEADER_KEY];
  const bodyHtml = escapeHtml(message).replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:#f5f1ee; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ee; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:#2b2b2b;">
                <img src="${headerImage}" alt="Haus of Defined Beauty" width="560" style="display:block; width:100%; height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px; color:#2b2b2b; font-size:15px; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <hr style="border:none; border-top:1px solid #e8e0da; margin:0 0 16px;" />
                <p style="margin:0; color:#7a6f68; font-size:13px; line-height:1.6;">
                  Website: <a href="${WEBSITE_URL}" style="color:#c4a882; text-decoration:none;">${WEBSITE_URL.replace(/^https?:\/\//, '')}</a><br>
                  WhatsApp: <a href="${WHATSAPP_URL}" style="color:#c4a882; text-decoration:none;">${WHATSAPP_LABEL}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = { wrapEmail, WEBSITE_URL, WHATSAPP_URL, WHATSAPP_LABEL, HEADER_IMAGES };
