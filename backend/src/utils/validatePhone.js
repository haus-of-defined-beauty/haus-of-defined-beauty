// Phone numbers as South Africans actually write them — 081 400 2859,
// 0814002859, +27 81 400 2859, 0027814002859 — plus a plain international
// number for anyone dialling from abroad. Stored in one tidy format so
// reports and WhatsApp links don't have to guess.
// Keep in step with frontend/src/utils/phoneCheck.js.

// Everything people put between the digits for readability.
const SEPARATORS = /[\s()\-.‐-―]/g;

const stripSeparators = value => String(value == null ? '' : value).replace(SEPARATORS, '').trim();

const formatSa = nine => `+27 ${nine.slice(0, 2)} ${nine.slice(2, 5)} ${nine.slice(5)}`;

// -> { ok: true, phone } | { ok: false, phone, message }
function checkPhone(raw) {
  const compact = stripSeparators(raw);
  if (!compact) return { ok: false, phone: '', message: 'Please enter your phone number.' };

  // 00 is the same as + — the old way of writing an international prefix.
  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;

  if (!/^\+?\d+$/.test(normalized)) {
    return {
      ok: false,
      phone: compact,
      message: 'A phone number can only contain digits, spaces and + ( ) -.',
    };
  }

  const digits = normalized.replace('+', '');

  // South African, however it was written: 0XXXXXXXXX, 27XXXXXXXXX, +27XXXXXXXXX.
  if (digits.startsWith('27') && digits.length === 11) {
    return { ok: true, phone: formatSa(digits.slice(2)) };
  }
  if (/^0\d{9}$/.test(digits)) {
    return { ok: true, phone: formatSa(digits.slice(1)) };
  }
  // A local number that's the wrong length is far more likely a typo than a
  // foreign number, so say what a complete one looks like.
  if (digits.startsWith('0') || (digits.startsWith('27') && !normalized.startsWith('+'))) {
    return {
      ok: false,
      phone: compact,
      message: 'That looks like an incomplete number — a South African number has 10 digits, like 081 400 2859.',
    };
  }

  // Anything else is only accepted as an explicit international number, so a
  // stray "8140028" can't slip through as if it were valid.
  if (normalized.startsWith('+') && digits.length >= 8 && digits.length <= 15) {
    return { ok: true, phone: `+${digits}` };
  }

  return {
    ok: false,
    phone: compact,
    message: 'Please enter a valid phone number, like 081 400 2859 (or +27 81 400 2859).',
  };
}

const phoneProblem = raw => {
  const result = checkPhone(raw);
  return result.ok ? null : result.message;
};

module.exports = { checkPhone, phoneProblem, stripSeparators };
