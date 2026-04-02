const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  driverId: { type: String, unique: true }, // Custom readable ID like WOG-1234
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String },
  profilePicture: { type: String },
  rating: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save hook to hash password and generate driverId if new
driverSchema.pre('save', async function(next) {
  // Generate Custom User ID if it doesn't exist
  if (!this.driverId) {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digit random number
    this.driverId = `WOG-DRV-${randomNum}`;
  }

  // Hash password only if modified
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to verify password match
driverSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Driver', driverSchema);
