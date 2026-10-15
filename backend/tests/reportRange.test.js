const {
  describePeriod,
  lastMonthRange,
  parseIsoDate,
  rangeFromQuery,
} = require('../src/utils/reportRange');

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('parseIsoDate', () => {
  it('reads a yyyy-mm-dd day as a local date', () => {
    const d = parseIsoDate('2026-10-15');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 15]);
    expect(d.getHours()).toBe(0);
  });

  it.each([
    ['', 'empty'],
    [undefined, 'missing'],
    ['15/10/2026', 'the wrong format'],
    ['2026-10', 'a part of a date'],
    ['2026-13-01', 'month 13'],
    ['2026-02-31', 'a day that month does not have'],
  ])('rejects %p (%s)', value => {
    expect(parseIsoDate(value)).toBeNull();
  });
});

describe('rangeFromQuery', () => {
  const now = new Date(2026, 9, 15); // 15 Oct 2026

  it('defaults to last calendar month when no range is given', () => {
    const { start, end } = rangeFromQuery({}, now);
    expect(iso(start)).toBe('2026-09-01');
    expect(iso(end)).toBe('2026-10-01'); // exclusive
  });

  it.each([
    [{ from: '2026-10-01' }, 'only a start'],
    [{ to: '2026-10-31' }, 'only an end'],
    [{ from: 'last week', to: '2026-10-31' }, 'nonsense'],
  ])('falls back to last month for %p (%s)', query => {
    expect(iso(rangeFromQuery(query, now).start)).toBe('2026-09-01');
  });

  it('covers both of the chosen days inclusively', () => {
    const { start, end } = rangeFromQuery({ from: '2026-10-05', to: '2026-10-09' }, now);
    expect(iso(start)).toBe('2026-10-05');
    expect(iso(end)).toBe('2026-10-10'); // the 9th is in, the 10th is not
  });

  it('reads a backwards range the way it was meant', () => {
    const { start, end } = rangeFromQuery({ from: '2026-10-09', to: '2026-10-05' }, now);
    expect(iso(start)).toBe('2026-10-05');
    expect(iso(end)).toBe('2026-10-10');
  });

  it('accepts a single day', () => {
    const { start, end } = rangeFromQuery({ from: '2026-10-07', to: '2026-10-07' }, now);
    expect(iso(start)).toBe('2026-10-07');
    expect(iso(end)).toBe('2026-10-08');
  });
});

describe('describePeriod', () => {
  it('names a range that is exactly one calendar month', () => {
    const { start, end } = lastMonthRange(new Date(2026, 9, 15));
    expect(describePeriod(start, end)).toEqual({
      label: 'September 2026',
      startFormatted: '01/09/2026',
      endFormatted: '30/09/2026',
    });
  });

  it('names February correctly in a leap year', () => {
    const { label, endFormatted } = describePeriod(new Date(2028, 1, 1), new Date(2028, 2, 1));
    expect(label).toBe('February 2028');
    expect(endFormatted).toBe('29/02/2028');
  });

  it('spells out a range that is not a whole month', () => {
    const { start, end } = rangeFromQuery({ from: '2026-10-05', to: '2026-10-09' });
    expect(describePeriod(start, end).label).toBe('05/10/2026 – 09/10/2026');
  });

  it('spells out a range spanning several months', () => {
    const { start, end } = rangeFromQuery({ from: '2026-08-01', to: '2026-10-31' });
    expect(describePeriod(start, end)).toMatchObject({
      label: '01/08/2026 – 31/10/2026',
      endFormatted: '31/10/2026',
    });
  });

  it('reads the end as the last day covered, not the exclusive bound', () => {
    const { start, end } = rangeFromQuery({ from: '2026-10-01', to: '2026-10-31' });
    expect(describePeriod(start, end).endFormatted).toBe('31/10/2026');
  });
});
