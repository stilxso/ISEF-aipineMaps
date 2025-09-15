const mongoose = require('mongoose');

const gpxFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Made optional for system GPX files
  s3Url: { type: String, required: true }, // S3 URL for file storage
  s3Key: { type: String, required: true }, // S3 object key
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
  // Metadata fields (calculated and stored for performance)
  difficulty: { type: String }, // e.g., 'A', 'B', 'C'
  elevation_gain: { type: Number }, // meters
  peak_height: { type: Number }, // meters
  peak_latitude: { type: Number }, // latitude of peak
  peak_longitude: { type: Number }, // longitude of peak
  total_distance: { type: Number }, // kilometers
  route_type: { type: String, default: 'hiking' },
  estimated_time: { type: String },
  season: { type: String },
  // Processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: { type: String }
});

module.exports = mongoose.model('GpxFile', gpxFileSchema);