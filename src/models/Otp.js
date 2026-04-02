const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String },
  email: { type: String },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // 10 minute expiry
}, { timestamps: true });

module.exports = mongoose.model('Otp', otpSchema);
