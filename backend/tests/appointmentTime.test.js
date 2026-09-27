const { appointmentInstant } = require('../src/utils/appointmentTime');

describe('appointmentInstant', () => {
  test('converts a SAST wall-clock time to the correct UTC instant', () => {
    // 09:00 in Johannesburg (UTC+2) on 25 Aug 2026 is 07:00 UTC.
    const result = appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '09:00');
    expect(result.toISOString()).toBe('2026-08-25T07:00:00.000Z');
  });

  test('handles the salon\'s full opening-hours range', () => {
    expect(appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '08:00').toISOString()).toBe('2026-08-25T06:00:00.000Z');
    expect(appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '17:00').toISOString()).toBe('2026-08-25T15:00:00.000Z');
  });

  test('is independent of the process/local timezone', () => {
    const original = process.env.TZ;
    for (const tz of ['UTC', 'America/New_York', 'Pacific/Auckland']) {
      process.env.TZ = tz;
      const result = appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '09:00');
      expect(result.toISOString()).toBe('2026-08-25T07:00:00.000Z');
    }
    process.env.TZ = original;
  });

  test('accepts a date-only string the same way the API receives it', () => {
    expect(appointmentInstant('2026-08-25', '09:00').toISOString()).toBe('2026-08-25T07:00:00.000Z');
  });

  test('minutes are carried correctly', () => {
    expect(appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '09:30').toISOString()).toBe('2026-08-25T07:30:00.000Z');
  });

  test('a booking exactly 60 minutes away and one just past both compute correctly against "now"', () => {
    const now = new Date('2026-08-25T07:00:00.000Z'); // 09:00 SAST
    const in60 = appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '10:00'); // 60 min later
    const in61 = appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '10:01');
    const justPassed = appointmentInstant(new Date(Date.UTC(2026, 7, 25)), '08:59');
    expect((in60 - now) / 60000).toBe(60);
    expect((in61 - now) / 60000).toBe(61);
    expect((justPassed - now) / 60000).toBe(-1);
  });
});
