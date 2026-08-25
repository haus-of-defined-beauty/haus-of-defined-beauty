// Creates (or updates the name of) an Admin account. This is the ONLY way an
// Admin document can come into existence — the login API never creates one,
// specifically so a stranger can't just pick "Admin" and get in.
//
// Usage: node scripts/seedAdmin.js <email> [name]
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');

const email = process.argv[2];
const name = process.argv[3] || 'Admin';

if (!email) {
  console.error('Usage: node scripts/seedAdmin.js <email> [name]');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await Admin.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name } },
    { upsert: true, new: true }
  );
  console.log(`Admin ready: ${admin.email} (${admin.name})`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
