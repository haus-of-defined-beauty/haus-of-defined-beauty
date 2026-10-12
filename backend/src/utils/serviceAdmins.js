const Admin = require('../models/Admin');

// The admins who actually work on a given service category. Availability is
// per-artist, so this is what decides whose open slots a customer is offered
// when they pick a service.
async function adminsForCategory(category) {
  if (!category) return [];
  return Admin.find({ specialties: category }).select('_id name specialties');
}

// Just the ids, for the slot-matching helpers.
async function adminIdsForCategory(category) {
  const admins = await adminsForCategory(category);
  return admins.map(a => a._id);
}

module.exports = { adminsForCategory, adminIdsForCategory };
