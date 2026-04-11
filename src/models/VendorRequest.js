const mongoose = require('mongoose');

const vendorRequestSchema = new mongoose.Schema({
  vendorId: { type: String, required: true },
  vendorName: { type: String, required: true },
  agencyName: { type: String },
  workLocation: { type: String },
  description: { type: String },
  contactNumber: { type: String },
  email: { type: String },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  vehicleDetails: {
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    licensePlate: { type: String },
    color: { type: String },
    vehicleType: { type: String },
    seatingCapacity: { type: Number }
  },
  assignedFromDate: { type: Date },
  assignedToDate: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('VendorRequest', vendorRequestSchema);
