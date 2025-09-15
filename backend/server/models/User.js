const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String },
  phoneNumber: { type: String },
  photo: { type: String },
  equipment: [{ type: String }],
  fullName: { type: String },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'GpxFile' },
  departureDateTime: { type: Date },
  role: { type: String, enum: ['user', 'rescuer'], default: 'user' },
  lastCheckin: { type: Date },
  hikeSession: {
    routeName: String,
    groupSize: Number,
    experienceLevel: String,
    medicalConditions: String,
    emergencyContacts: [String],
    timestamp: Date
  },
  dataRetentionConsent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);