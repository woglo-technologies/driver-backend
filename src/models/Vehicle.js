const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number },
  licensePlate: { type: String, required: true, unique: true },
  color: { type: String },
  photos: [{ type: String }],
  isApproved: { type: Boolean, default: false },
  vendorName: { type: String },
  agencyName: { type: String },
  workLocation: { type: String },
  description: { type: String },
  partnershipDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
