const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // minutes
  price: { type: Number, required: true },
  category: { type: String, enum: ['nails', 'lashes', 'makeup', 'hair', 'masterclass'] },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
