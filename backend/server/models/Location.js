const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  coords: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } 
  },
  accuracy: { type: Number },  
  altitude: { type: Number },
  speed: { type: Number },
  provider: { type: String }, 
  recordedAt: { type: Date, required: true, default: Date.now, index: true }
}, {
  timestamps: true
});

locationSchema.index({ coords: '2dsphere' });

module.exports = mongoose.model('Location', locationSchema);
