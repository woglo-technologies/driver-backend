const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  // Vehicle identification
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number },
  licensePlate: { type: String, required: true, unique: true },
  color: { type: String },
  vehicleType: { type: String },          // e.g. "SUV", "Sedan"
  seatingCapacity: { type: Number },
  photos: [{ type: String }],
  isApproved: { type: Boolean, default: false },
  // Vendor info
  vendorId: { type: String },
  vendorName: { type: String },
  vendorContactNumber: { type: String },
  vendorEmail: { type: String },
  agencyName: { type: String },
  workLocation: { type: String },
  description: { type: String },
  // Assignment date range (set when vendor explicitly assigns)
  assignedFromDate: { type: Date },
  assignedToDate: { type: Date },
  partnershipDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
