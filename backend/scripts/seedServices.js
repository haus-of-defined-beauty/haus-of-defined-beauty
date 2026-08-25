require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../src/models/Service');

const services = [
  { name: 'Basic Install', category: 'hair', duration: 120, price: 0 },
  { name: 'Style & Install', category: 'hair', duration: 60, price: 0 },
  { name: 'Frontal Pony (Your Hair)', category: 'hair', duration: 30, price: 0 },
  { name: 'Frontal Pony (Hair)', category: 'hair', duration: 45, price: 0 },

  { name: 'Plain Gel', category: 'nails', duration: 30, price: 0 },
  { name: 'Plain Acrylic', category: 'nails', duration: 120, price: 0 },
  { name: 'Plain Poly Gel', category: 'nails', duration: 120, price: 0 },
  { name: 'Gel Toes', category: 'nails', duration: 45, price: 0 },

  { name: 'Full Glam', category: 'makeup', duration: 60, price: 0 },
  { name: 'Natural Look', category: 'makeup', duration: 45, price: 0 },
  { name: 'Soft Glam', category: 'makeup', duration: 120, price: 0 },

  { name: 'Lash Application', category: 'lashes', duration: 30, price: 0 },
  { name: 'Hybrid Lashes', category: 'lashes', duration: 120, price: 0 },
  { name: 'Volume Lashes', category: 'lashes', duration: 120, price: 0 },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await Service.insertMany(services);
  console.log(`Seeded ${services.length} services.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
