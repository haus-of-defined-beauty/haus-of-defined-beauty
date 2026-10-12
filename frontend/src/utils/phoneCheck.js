// Instant, in-browser phone check. The server applies the same rule
// (backend/src/utils/validatePhone.js) — keep the two in step.
const SEPARATORS = /[\s()\-.‐-―]/g;

const stripSeparators = value => String(value == null ? '' : value).replace(SEPARATORS, '').trim();

const formatSa = nine => `+27 ${nine.slice(0, 2)} ${nine.slice(2, 5)} ${nine.slice(5)}`;

// Plain-language problem, or '' when the number is fine.
export function phoneProblem(raw) {
  const compact = stripSeparators(raw);
  if (!compact) return 'Please enter your phone number.';

  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  if (!/^\+?\d+$/.test(normalized)) return 'A phone number can only contain digits, spaces and + ( ) -.';

  const digits = normalized.replace('+', '');
  if (digits.startsWith('27') && digits.length === 11) return '';
  if (/^0\d{9}$/.test(digits)) return '';
  if (digits.startsWith('0') || (digits.startsWith('27') && !normalized.startsWith('+'))) {
    return 'That looks like an incomplete number — a South African number has 10 digits, like 081 400 2859.';
  }
  if (normalized.startsWith('+') && digits.length >= 8 && digits.length <= 15) return '';

  return 'Please enter a valid phone number, like 081 400 2859 (or +27 81 400 2859).';
}

// Tidies a valid number into the one format profiles are stored in.
export function normalizePhone(raw) {
  const compact = stripSeparators(raw);
  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  const digits = normalized.replace('+', '');
  if (digits.startsWith('27') && digits.length === 11) return formatSa(digits.slice(2));
  if (/^0\d{9}$/.test(digits)) return formatSa(digits.slice(1));
  if (normalized.startsWith('+')) return `+${digits}`;
  return compact;
}
