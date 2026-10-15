const Admin = require('../models/Admin');
const Service = require('../models/Service');
const { SERVICE_CATEGORIES } = require('../models/Admin');

// An admin's own work: the bookings for services they actually offer.
//
// Most bookings carry no adminId at all — they predate per-artist allocation
// — so filtering on that alone put the whole salon's work on both dashboards,
// and the nail artist saw hair appointments she can do nothing about. The
// service's category is what decides whose list a booking belongs on, the
// same way it decides whose availability a customer is offered.
//
// Where two artists share a category, the allocation still separates them:
// each sees the ones taken in their own availability (or in nobody's), not
// the other's. Where a category is theirs alone — the salon's actual setup —
// that condition is satisfied by everything, so a booking filed against the
// wrong artist back when both did everything still shows up on the right one.
//
// A category nobody claims (masterclasses) stays visible to both rather than
// disappearing from the system.
async function ownBookingsFilter(adminId) {
  const admins = await Admin.find().select('specialties');
  const me = admins.find(a => String(a._id) === String(adminId));
  const categories = me?.specialties?.length ? me.specialties : SERVICE_CATEGORIES;

  const services = await Service.find({
    $or: [
      { category: { $in: categories } },
      { category: { $nin: SERVICE_CATEGORIES } },
    ],
  }).select('_id');

  const sharesACategory = admins.filter(a =>
    String(a._id) !== String(adminId) &&
    (a.specialties || []).some(c => categories.includes(c)));

  return {
    serviceId: { $in: services.map(s => s._id) },
    $or: [
      { adminId },
      // `adminId: null` also matches documents without the field at all.
      { adminId: null },
      { adminId: { $nin: sharesACategory.map(a => a._id) } },
    ],
  };
}

module.exports = { ownBookingsFilter };
