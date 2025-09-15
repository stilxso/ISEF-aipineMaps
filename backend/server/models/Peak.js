const mongoose = require('mongoose');

const peakSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  elevation: { type: Number },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: { type: String },
  diffGrade: { type: String },
  difficulty: { type: String }, // Keep for backward compatibility
  gpxUrl: { type: String },
  lat: { type: Number }, // Keep for backward compatibility
  lon: { type: Number }, // Keep for backward compatibility
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Peak', peakSchema);