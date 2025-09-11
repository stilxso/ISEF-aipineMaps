const mongoose = require('mongoose');

const gpxFileSchema = new mongoose.Schema({
  filename: { type: String, required: true }, 
  originalName: { type: String, required: true }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  path: { type: String, required: true }, 
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GpxFile', gpxFileSchema);