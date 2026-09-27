// Instant, in-browser name check. The server applies the same rule
// (backend/src/utils/validateName.js) — keep the two in step.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u;

export const normalizeName = value => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();

// Plain-language problem, or '' when the name is fine. `label` is how the field
// is described to the person: "name", "surname"...
export function nameProblem(raw, label = 'name') {
  const name = normalizeName(raw);
  if (!name) return `Please enter your ${label}.`;
  if (name.length > 80) return `Your ${label} is too long (80 characters at most).`;
  if (!/\p{L}/u.test(name)) return `Your ${label} needs to include letters.`;
  if (!NAME_RE.test(name)) {
    return `Your ${label} can only contain letters, spaces, apostrophes, hyphens and full stops.`;
  }
  return '';
}
