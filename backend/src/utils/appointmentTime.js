// Haus of Defined Beauty operates in Johannesburg, which is UTC+2 all year
// round (South Africa does not observe daylight saving). Booking.date is
// stored as a UTC-midnight Date representing the calendar day; Booking.time
// is the "HH:MM" wall-clock time in that same Johannesburg timezone. This
// combines the two into the actual UTC instant the appointment starts,
// independent of whatever timezone the server process itself happens to run
// in (a local dev machine and a Vercel function can differ).
const SAST_OFFSET_MINUTES = 120;

function appointmentInstant(date, time) {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date(date);
  const utcMillis = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hours, minutes);
  return new Date(utcMillis - SAST_OFFSET_MINUTES * 60 * 1000);
}

module.exports = { appointmentInstant, SAST_OFFSET_MINUTES };
