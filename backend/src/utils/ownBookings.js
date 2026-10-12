// An admin's own work: bookings taken in their availability, plus any that
// predate per-artist allocation (adminId null) — those belong to nobody, so
// hiding them from both artists would lose them entirely.
function ownBookingsFilter(adminId) {
  return { $or: [{ adminId }, { adminId: null }, { adminId: { $exists: false } }] };
}

module.exports = { ownBookingsFilter };
