// A name must contain real letters — blank, whitespace-only, "..." or "123"
// are not names. Keep in step with frontend/src/utils/nameCheck.js.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u;

// Names an account can be left with when nobody typed a real one.
const PLACEHOLDER_NAMES = new Set(['admin', 'customer user']);

const normalizeName = value => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();

// `label` is how the field is described to the person: "name", "surname"...
function nameProblem(name, label = 'name') {
  if (!name) return `Please enter your ${label}.`;
  if (name.length > 80) return `Your ${label} is too long (80 characters at most).`;
  if (!/\p{L}/u.test(name)) return `Your ${label} needs to include letters.`;
  if (!NAME_RE.test(name)) {
    return `Your ${label} can only contain letters, spaces, apostrophes, hyphens and full stops.`;
  }
  return null;
}

// -> { ok: true, name } | { ok: false, name, message }
function checkName(raw, label = 'name') {
  const name = normalizeName(raw);
  const message = nameProblem(name, label);
  return message ? { ok: false, name, message } : { ok: true, name };
}

const isPlaceholderName = name => !name || PLACEHOLDER_NAMES.has(normalizeName(name).toLowerCase());

module.exports = { normalizeName, nameProblem, checkName, isPlaceholderName };
