const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['CHECKIN_MISSED', 'SOS'], required: true },
  status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);