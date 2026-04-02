const mongoose = require('mongoose');

const vendorRequestSchema = new mongoose.Schema({
  vendorId: { type: String, required: true },
  vendorName: { type: String, required: true },
  agencyName: { type: String },
  workLocation: { type: String },
  description: { type: String },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  vehicleDetails: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number },
    licensePlate: { type: String, required: true },
    color: { type: String }
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('VendorRequest', vendorRequestSchema);
