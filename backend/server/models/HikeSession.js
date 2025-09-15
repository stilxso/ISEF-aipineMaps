const mongoose = require('mongoose');

const hikeSessionSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true
  },
  routeName: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startTime: {
    type: Date,
    required: true
  },
  controlTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  startLocation: {
    latitude: Number,
    longitude: Number,
    altitude: Number
  },
  endLocation: {
    latitude: Number,
    longitude: Number,
    altitude: Number
  },
  weather: {
    temperature: Number,
    description: String,
    windSpeed: Number
  },
  totalDistance: {
    type: Number // in meters
  },
  totalTime: {
    type: Number // in seconds
  },
  waypoints: [{
    name: String,
    latitude: Number,
    longitude: Number,
    timestamp: Date
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  overdueNotified: {
    type: Boolean,
    default: false
  },
  aiInteractions: [{
    timestamp: Date,
    message: String,
    response: String,
    important: Boolean
  }],
  weatherAlerts: [{
    timestamp: Date,
    location: {
      latitude: Number,
      longitude: Number
    },
    changes: [{
      type: String,
      message: String,
      severity: String
    }],
    weather: Object
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('HikeSession', hikeSessionSchema);