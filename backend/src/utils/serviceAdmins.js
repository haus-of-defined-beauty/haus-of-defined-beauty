const Admin = require('../models/Admin');

// The admins who actually work on a given service category. Availability is
// per-artist, so this is what decides whose open slots a customer is offered
// when they pick a service.
//
// An admin with no specialties recorded counts for everything, matching the
// schema default. That matters because the field was added after the admin
// accounts existed: Mongoose fills the default in when it hydrates a
// document, so they *look* like they do every service, but a query on the
// field matches nothing — which left no artist doing any service and so an
// empty booking calendar.
async function adminsForCategory(category) {
  if (!category) return [];
  return Admin.find({
    $or: [
      { specialties: category },
      { specialties: { $exists: false } },
      { specialties: { $size: 0 } },
    ],
  }).select('_id name specialties');
}

// Just the ids, for the slot-matching helpers.
async function adminIdsForCategory(category) {
  const admins = await adminsForCategory(category);
  return admins.map(a => a._id);
}

module.exports = { adminsForCategory, adminIdsForCategory };
