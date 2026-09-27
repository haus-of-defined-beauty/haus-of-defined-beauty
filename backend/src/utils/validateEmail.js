const dns = require('dns').promises;

const LOCAL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_RE = /^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/;
const DNS_TIMEOUT_MS = 3000;

const normalizeEmail = value => String(value == null ? '' : value).trim().toLowerCase();

// Returns a plain-language problem, or null when the address is well-formed.
// Keep in step with frontend/src/utils/emailCheck.js.
function syntaxProblem(email) {
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

  return null;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Only "this name does not exist / has no such record" counts as a NO. Any
// other DNS failure (timeout, resolver down) is treated as "can't tell" so a
// flaky lookup never stops a real customer from signing in.
const DEFINITELY_NO = new Set(['ENOTFOUND', 'ENODATA']);

async function domainCanReceiveMail(domain) {
  try {
    const mx = await withTimeout(dns.resolveMx(domain), DNS_TIMEOUT_MS);
    if (mx.some(r => r.exchange && r.exchange !== '.')) return true;
  } catch (err) {
    if (!DEFINITELY_NO.has(err.code)) return true;
  }

  // No MX record: mail servers fall back to the domain's own address record.
  for (const lookup of ['resolve4', 'resolve6']) {
    try {
      const addresses = await withTimeout(dns[lookup](domain), DNS_TIMEOUT_MS);
      if (addresses.length) return true;
    } catch (err) {
      if (!DEFINITELY_NO.has(err.code)) return true;
    }
  }
  return false;
}

// -> { ok: true, email } | { ok: false, email, message }
async function checkEmail(raw, { checkDomain = true } = {}) {
  const email = normalizeEmail(raw);

  const problem = syntaxProblem(email);
  if (problem) return { ok: false, email, message: problem };

  if (checkDomain) {
    const domain = email.split('@')[1];
    if (!(await domainCanReceiveMail(domain))) {
      return {
        ok: false,
        email,
        message: `We couldn't find a mail server for "${domain}". Please check the spelling of your email address.`,
      };
    }
  }
  return { ok: true, email };
}

module.exports = { normalizeEmail, syntaxProblem, domainCanReceiveMail, checkEmail };
