const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true, default: 100 }, // R100 booking fee
  status: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'pending' },
  gatewayReference: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
