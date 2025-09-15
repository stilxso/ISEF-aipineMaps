const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['CHECKIN_MISSED', 'SOS'], required: true },
  status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  location: {
    latitude: Number,
    longitude: Number,
    altitude: Number,
    accuracy: Number,
    heading: Number,
    speed: Number
  },
  riskAssessment: {
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'unknown'] },
    confidence: Number,
    probabilities: {
      low: Number,
      medium: Number,
      high: Number
    }
  },
  predictedLocation: {
    latitude: Number,
    longitude: Number,
    confidence: Number
  },
  additionalData: mongoose.Schema.Types.Mixed, // For battery level, terrain, etc.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);