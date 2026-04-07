const mongoose = require('mongoose');

const tripEventSchema = new mongoose.Schema({
  type: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String },
  details: { type: String },
  time: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true }
});

const tripDaySchema = new mongoose.Schema({
  label: { type: String, required: true },
  date: { type: String, required: true },
  events: [tripEventSchema]
});

const tripStopSchema = new mongoose.Schema({
  place: { type: String, required: true },
  type: { type: String, required: true },
  duration: { type: String, required: true }
});

const tripAccommodationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true }
});

const tripReviewSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  date: { type: Date, default: Date.now }
});

const tripSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  title: { type: String, required: true },
  startLocation: { type: String, required: true },
  destination: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:MM AM/PM
  customerName: { type: String, required: true },
  numberOfDays: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], 
    default: 'upcoming' 
  },
  stops: [tripStopSchema],
  accommodation: [tripAccommodationSchema],
  days: [tripDaySchema],
  reviews: [tripReviewSchema],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Virtual for calculating overall rating
tripSchema.virtual('overallRating').get(function() {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / this.reviews.length;
});

module.exports = mongoose.model('Trip', tripSchema);
