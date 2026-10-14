// Writes the default specialties onto admin accounts that predate the field.
//
// `specialties` was added to the Admin schema after these accounts existed,
// so the documents don't carry it. Mongoose fills the default in whenever it
// loads one, which makes them look correct everywhere you'd check by hand —
// but a query on the field (which is how the booking page decides whose
// availability to offer for a service) matches nothing at all.
//
// Storing the default makes the data say what the application already
// assumes, and lets each artist narrow it from My Profile.
//
//   node scripts/backfillSpecialties.js            # report only
//   node scripts/backfillSpecialties.js --apply    # write the changes
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const { SERVICE_CATEGORIES } = require('../src/models/Admin');

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Read through the driver, not the model, so schema defaults don't hide
  // what is actually stored.
  const raw = await mongoose.connection.db.collection('admins').find({}).toArray();
  const missing = raw.filter(a => !Array.isArray(a.specialties) || a.specialties.length === 0);

  console.log(`${raw.length} admin account(s)`);
  for (const a of raw) {
    const stored = Array.isArray(a.specialties) ? a.specialties.join(', ') : '(not stored)';
    console.log(`  ${a.name}: ${stored}`);
  }

  if (!missing.length) {
    console.log('\nNothing to do — every account has its specialties stored.');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n${missing.length} account(s) ${apply ? 'updated to' : 'would be set to'}: ${SERVICE_CATEGORIES.join(', ')}`);
  if (apply) {
    await Admin.updateMany(
      { _id: { $in: missing.map(a => a._id) } },
      { $set: { specialties: SERVICE_CATEGORIES } }
    );
    console.log('Each artist can now narrow this from My Profile.');
  } else {
    console.log('\nDry run — re-run with --apply to make the change.');
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
