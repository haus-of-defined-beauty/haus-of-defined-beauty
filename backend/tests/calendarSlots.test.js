const { findCoveredSlots, splitRange } = require('../src/utils/calendarSlots');

const NAILS = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const HAIR = 'bbbbbbbbbbbbbbbbbbbbbbb2';

// The opening-hours template for one artist: hourly slots from 08:00 to 17:00.
const openingHours = (adminId, { booked = [] } = {}) =>
  Array.from({ length: 9 }, (_, i) => {
    const start = `${String(8 + i).padStart(2, '0')}:00`;
    return {
      start,
      end: `${String(9 + i).padStart(2, '0')}:00`,
      status: booked.includes(start) ? 'booked' : 'available',
      adminId,
    };
  });

const day = slots => ({ slots });
const starts = covered => covered && covered.map(s => s.start);

describe('findCoveredSlots', () => {
  it('covers a service that fits inside one slot', () => {
    const d = day(openingHours(NAILS));
    expect(starts(findCoveredSlots(d, '09:00', 45, [NAILS]))).toEqual(['09:00']);
  });

  it('covers a long service across consecutive slots', () => {
    const d = day(openingHours(NAILS));
    expect(starts(findCoveredSlots(d, '09:00', 120, [NAILS]))).toEqual(['09:00', '10:00']);
  });

  // Closing time is 17:00, so a two-hour service cannot start at 16:00 even
  // though 16:00 itself is open — this is what used to be offered to
  // customers as "16:00 - 18:00" and then refused at the last step.
  it('refuses a service that would run past the last open slot', () => {
    const d = day(openingHours(NAILS));
    expect(findCoveredSlots(d, '16:00', 120, [NAILS])).toBeNull();
    expect(starts(findCoveredSlots(d, '16:00', 60, [NAILS]))).toEqual(['16:00']);
  });

  it('refuses a start that runs into a booked slot', () => {
    const d = day(openingHours(NAILS, { booked: ['10:00'] }));
    expect(findCoveredSlots(d, '09:00', 120, [NAILS])).toBeNull();
    expect(starts(findCoveredSlots(d, '09:00', 60, [NAILS]))).toEqual(['09:00']);
  });

  it('refuses a start nobody has open', () => {
    const d = day(openingHours(NAILS));
    expect(findCoveredSlots(d, '07:00', 60, [NAILS])).toBeNull();
  });

  describe('per-artist availability', () => {
    it("ignores an artist who doesn't do the service", () => {
      const d = day(openingHours(NAILS));
      expect(findCoveredSlots(d, '09:00', 60, [HAIR])).toBeNull();
    });

    it('finds the right artist when both are open at that hour', () => {
      const d = day([...openingHours(NAILS), ...openingHours(HAIR)]);
      expect(findCoveredSlots(d, '09:00', 60, [HAIR])[0].adminId).toBe(HAIR);
      expect(findCoveredSlots(d, '09:00', 60, [NAILS])[0].adminId).toBe(NAILS);
    });

    // Two artists both free at 09:00 is not one long opening — walking them as
    // a single timeline read the second artist's 09:00 as a gap and refused a
    // booking that was perfectly available.
    it('treats each artist as their own timeline', () => {
      const d = day([...openingHours(NAILS), ...openingHours(HAIR)]);
      expect(starts(findCoveredSlots(d, '09:00', 120, [NAILS, HAIR]))).toEqual(['09:00', '10:00']);
    });

    it('will not stitch one appointment out of two artists’ slots', () => {
      const d = day([
        { start: '09:00', end: '10:00', status: 'available', adminId: NAILS },
        { start: '10:00', end: '11:00', status: 'available', adminId: HAIR },
      ]);
      expect(findCoveredSlots(d, '09:00', 120, [NAILS, HAIR])).toBeNull();
    });

    it('falls back to the free artist when the other is booked', () => {
      const d = day([
        ...openingHours(NAILS, { booked: ['09:00'] }),
        ...openingHours(HAIR),
      ]);
      expect(findCoveredSlots(d, '09:00', 60, [NAILS, HAIR])[0].adminId).toBe(HAIR);
    });

    // Slots laid down before availability was per-artist have no owner, so
    // they stay bookable for anything rather than vanishing.
    it('keeps unowned slots open to any service', () => {
      const d = day([{ start: '09:00', end: '10:00', status: 'available', adminId: null }]);
      expect(starts(findCoveredSlots(d, '09:00', 60, [HAIR]))).toEqual(['09:00']);
    });
  });
});

describe('splitRange', () => {
  const asText = units => units.map(u => `${u.start}-${u.end}`);

  it('leaves an hour alone', () => {
    expect(asText(splitRange('09:00', '10:00'))).toEqual(['09:00-10:00']);
  });

  it('leaves a short block alone', () => {
    expect(asText(splitRange('09:00', '09:30'))).toEqual(['09:00-09:30']);
  });

  // A three-hour block used to be one bookable appointment; the rest of the
  // artist's morning could not be reached from the booking page at all.
  it('splits a long block into hourly units', () => {
    expect(asText(splitRange('08:30', '11:30'))).toEqual([
      '08:30-09:30', '09:30-10:30', '10:30-11:30',
    ]);
  });

  it('keeps the remainder as a shorter final unit', () => {
    expect(asText(splitRange('08:00', '09:30'))).toEqual(['08:00-09:00', '09:00-09:30']);
  });

  it('never runs past the end of the block', () => {
    const units = splitRange('10:00', '17:00');
    expect(units).toHaveLength(7);
    expect(units[units.length - 1].end).toBe('17:00');
  });

  it('gives nothing for an empty range', () => {
    expect(splitRange('09:00', '09:00')).toEqual([]);
  });
});
