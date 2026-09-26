const mongoose = require('mongoose');

const masterclassApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  surname: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
}, { timestamps: true });

module.exports = mongoose.model('MasterclassApplication', masterclassApplicationSchema);
