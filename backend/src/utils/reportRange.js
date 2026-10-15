// The period a report covers.
//
// Every report defaults to last calendar month, which is what the spec asks
// for, but the admin can pick any range from the Reports page — a month is no
// use for judging a quiet week or a whole season, and the reports had no way
// to ask for anything else.

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const fmtDMY = d => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};

// Describes a range for the report's heading, driven by the real query
// bounds rather than hardcoded text. `start` is inclusive, `end` exclusive,
// so the description reads to the last day actually covered. A range that
// happens to be exactly one calendar month is named as that month.
function describePeriod(start, end) {
  const endInclusive = new Date(end.getTime() - 1);
  const lastOfStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const isWholeMonth =
    start.getDate() === 1 &&
    endInclusive.getMonth() === start.getMonth() &&
    endInclusive.getFullYear() === start.getFullYear() &&
    endInclusive.getDate() === lastOfStartMonth;

  return {
    label: isWholeMonth
      ? `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
      : `${fmtDMY(start)} – ${fmtDMY(endInclusive)}`,
    startFormatted: fmtDMY(start),
    endFormatted: fmtDMY(endInclusive),
  };
}

// The default period. `end` is exclusive.
function lastMonthRange(now = new Date()) {
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 1),
  };
}

// An ISO yyyy-mm-dd, read as a local date so a range picked in SAST covers
// the days the admin actually chose.
function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // Rejects 2026-02-31 and friends, which Date would roll into March.
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

// `from`/`to` are inclusive calendar days. Anything missing or malformed
// falls back to last month rather than failing the request, and a range
// given backwards is read the way it was obviously meant.
function rangeFromQuery(query = {}, now = new Date()) {
  const from = parseIsoDate(query.from);
  const to = parseIsoDate(query.to);
  if (!from || !to) return lastMonthRange(now);

  const [start, endInclusive] = from <= to ? [from, to] : [to, from];
  return {
    start,
    end: new Date(endInclusive.getFullYear(), endInclusive.getMonth(), endInclusive.getDate() + 1),
  };
}

module.exports = { MONTH_NAMES, fmtDMY, describePeriod, lastMonthRange, parseIsoDate, rangeFromQuery };
