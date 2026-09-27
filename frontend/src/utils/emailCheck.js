// Instant, in-browser email checks. The server repeats the format check and
// also confirms the domain can receive mail (backend/src/utils/validateEmail.js)
// — keep the two format checks in step.

const LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/;

export const normalizeEmail = value => String(value == null ? '' : value).trim().toLowerCase();

// Plain-language problem, or '' when the address is well-formed.
export function emailProblem(raw) {
  const email = normalizeEmail(raw);
  if (!email) return 'Please enter your email address.';
  if (email.length > 254) return 'That email address is too long.';

  const at = email.indexOf('@');
  if (at < 1 || at !== email.lastIndexOf('@')) {
    return 'An email address needs one @ sign with text on both sides, like name@example.com.';
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length > 64) return 'The part before the @ is too long.';
  if (!LOCAL_RE.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return 'The part before the @ contains spaces or characters that are not allowed.';
  }

  const labels = domain.split('.');
  if (labels.length < 2) return 'After the @ we need a full domain, like example.com.';
  if (!labels.every(l => LABEL_RE.test(l))) return 'The part after the @ is not a valid domain.';
  if (!TLD_RE.test(labels[labels.length - 1])) return 'The domain should end in something like .com or .co.za.';

  return '';
}

const COMMON_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.za', 'yahoo.co.uk', 'ymail.com',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.co.za', 'outlook.com', 'outlook.co.za', 'live.com', 'live.co.za', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'mail.com', 'gmx.com', 'gmx.net', 'zoho.com',
  'proton.me', 'protonmail.com', 'mweb.co.za', 'telkomsa.net', 'vodamail.co.za', 'webmail.co.za', 'cybersmart.co.za',
];

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// If the domain looks like a slip of a well-known one (gmial.com, gmail.con,
// hotmial.com...), returns the corrected full address; otherwise ''.
// A hint only — never blocks on its own, since a rare real domain can look close.
export function suggestEmail(raw) {
  const email = normalizeEmail(raw);
  if (emailProblem(email)) return '';

  const at = email.indexOf('@');
  const domain = email.slice(at + 1);
  if (COMMON_DOMAINS.includes(domain)) return '';

  let best = '';
  let bestDistance = 3;
  for (const candidate of COMMON_DOMAINS) {
    const d = editDistance(domain, candidate);
    if (d < bestDistance) { best = candidate; bestDistance = d; }
  }
  return best ? `${email.slice(0, at)}@${best}` : '';
}
