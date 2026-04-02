const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: { type: String, required: true }, // e.g., 'Payment', 'Account', 'Technical'
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Support', supportSchema);
