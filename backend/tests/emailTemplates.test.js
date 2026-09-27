const { wrapEmail, HEADER_IMAGES, WEBSITE_URL, WHATSAPP_URL, WHATSAPP_LABEL } = require('../src/utils/emailTemplates');

describe('wrapEmail', () => {
  test('defaults to the booking header when no key is given', () => {
    const html = wrapEmail('Hi there');
    expect(html).toContain(HEADER_IMAGES.booking);
  });

  test('falls back to the booking header for an unknown key', () => {
    const html = wrapEmail('Hi there', 'not-a-real-key');
    expect(html).toContain(HEADER_IMAGES.booking);
    expect(html).not.toContain(HEADER_IMAGES.otp);
  });

  test.each(['otp', 'booking', 'reminder'])('picks the %s header when asked', (key) => {
    const html = wrapEmail('Hi there', key);
    expect(html).toContain(HEADER_IMAGES[key]);
  });

  test('escapes HTML in the message so it can never inject markup', () => {
    const html = wrapEmail('<script>alert(1)</script> & "quotes"');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&amp;');
  });

  test('turns newlines into <br> so multi-line messages stay formatted', () => {
    const html = wrapEmail('Line one\nLine two');
    expect(html).toContain('Line one<br>Line two');
  });

  test('always includes the website and WhatsApp contact footer', () => {
    const html = wrapEmail('Hi there');
    expect(html).toContain(WEBSITE_URL);
    expect(html).toContain(WHATSAPP_URL);
    expect(html).toContain(WHATSAPP_LABEL);
  });
});
