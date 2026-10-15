// Sets which services an artist works on.
//
// The salon runs one nail artist and one hair/makeup/lash artist, so each
// account needs its own list — with both set to everything, either artist's
// open hours counted as availability for the other's services and both
// dashboards showed the whole salon's bookings.
//
//   node scripts/setSpecialties.js                              # report only
//   node scripts/setSpecialties.js --apply                      # apply the salon's split
//   node scripts/setSpecialties.js someone@example.com nails,hair --apply
//
// With no email, the split below is applied by matching each admin's email.
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const { SERVICE_CATEGORIES } = require('../src/models/Admin');

const apply = process.argv.includes('--apply');
const args = process.argv.slice(2).filter(a => a !== '--apply');

// Gabriel does nails; Samia does everything else.
const SALON_SPLIT = {
  'gabethabo23@gmail.com': ['nails'],
  '2564952@students.wits.ac.za': ['hair', 'makeup', 'lashes'],
};

function parseCategories(raw) {
  const list = raw.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  const unknown = list.filter(c => !SERVICE_CATEGORIES.includes(c));
  if (unknown.length) {
    console.error(`Unknown service categor${unknown.length === 1 ? 'y' : 'ies'}: ${unknown.join(', ')}`);
    console.error(`Valid: ${SERVICE_CATEGORIES.join(', ')}`);
    process.exit(1);
  }
  if (!list.length) { console.error('Give at least one category.'); process.exit(1); }
  return list;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const wanted = args.length >= 2
    ? { [args[0].toLowerCase()]: parseCategories(args[1]) }
    : SALON_SPLIT;

  const admins = await Admin.find().select('name email specialties');
  let changes = 0;

  for (const admin of admins) {
    const target = wanted[admin.email];
    const current = (admin.specialties || []).join(', ') || '(none)';

    if (!target) {
      console.log(`  ${admin.name.padEnd(16)} ${current}  — left as is`);
      continue;
    }

    const same = target.length === (admin.specialties || []).length
      && target.every(c => admin.specialties.includes(c));
    if (same) {
      console.log(`  ${admin.name.padEnd(16)} ${current}  — already correct`);
      continue;
    }

    console.log(`  ${admin.name.padEnd(16)} ${current}  ->  ${target.join(', ')}`);
    changes += 1;
    if (apply) {
      admin.specialties = target;
      await admin.save();
    }
  }

  const missing = Object.keys(wanted).filter(e => !admins.some(a => a.email === e));
  for (const e of missing) console.log(`  ! no admin account for ${e}`);

  console.log(`\n${changes} account(s) ${apply ? 'updated' : 'would change'}`);
  if (!apply && changes) console.log('Dry run — re-run with --apply to make the change.');

  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
