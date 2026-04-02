const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  type: { 
    type: String, 
    enum: ['Driving License', 'Aadhar Card', 'PAN Card', 'Passport'], 
    required: true 
  },
  fileUrl: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Kyc', kycSchema);
