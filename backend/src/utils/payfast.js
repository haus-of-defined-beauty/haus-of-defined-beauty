const crypto = require('crypto');
const dns = require('dns');

const MODE = process.env.PAYFAST_MODE === 'live' ? 'live' : 'sandbox';
const PAYFAST_HOST = MODE === 'live' ? 'www.payfast.co.za' : 'sandbox.payfast.co.za';
const TRUSTED_HOSTS = ['www.payfast.co.za', 'sandbox.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za'];

// Matches PHP's urlencode(), which encodeURIComponent() does not: spaces
// become '+' (not %20), and a handful of punctuation chars are also escaped.
// This mismatch is the most common cause of PayFast signature failures.
function phpUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E')
    .replace(/%20/g, '+');
}

// `orderedFields` must be given in the order they should be signed in —
// PayFast requires field-insertion order, not alphabetical.
function generateSignature(orderedFields, passphrase) {
  let pfOutput = '';
  for (const [key, value] of Object.entries(orderedFields)) {
    if (value !== undefined && value !== null && value !== '') {
      pfOutput += `${key}=${phpUrlEncode(String(value).trim())}&`;
    }
  }
  pfOutput = pfOutput.slice(0, -1);
  if (passphrase) {
    pfOutput += `&passphrase=${phpUrlEncode(passphrase.trim())}`;
  }
  return crypto.createHash('md5').update(pfOutput).digest('hex');
}

// Verifies an incoming ITN's signature using the RAW posted body bytes
// (rather than re-encoding a parsed object), avoiding any decode/re-encode
// mismatch risk entirely.
function verifyItnSignature(rawBody, receivedSignature, passphrase) {
  let data = rawBody.replace(/&?signature=[^&]*/, '');
  if (passphrase) {
    data += `&passphrase=${phpUrlEncode(passphrase.trim())}`;
  }
  const expected = crypto.createHash('md5').update(data).digest('hex');
  return expected === receivedSignature;
}

function getProcessUrl() {
  return `https://${PAYFAST_HOST}/eng/process`;
}

async function validateWithPayfast(rawBody) {
  const res = await fetch(`https://${PAYFAST_HOST}/eng/query/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: rawBody,
  });
  const text = await res.text();
  return text.trim() === 'VALID';
}

function isFromTrustedHost(reqIp) {
  const ip = (reqIp || '').replace('::ffff:', '');
  return Promise.all(TRUSTED_HOSTS.map(host => dns.promises.lookup(host).then(r => r.address).catch(() => null)))
    .then(addresses => addresses.includes(ip));
}

module.exports = {
  MODE,
  PAYFAST_HOST,
  phpUrlEncode,
  generateSignature,
  verifyItnSignature,
  getProcessUrl,
  validateWithPayfast,
  isFromTrustedHost,
};
