const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  type: { type: String, enum: ['available', 'booked', 'leave'], required: true },
  date: { type: Date, required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
