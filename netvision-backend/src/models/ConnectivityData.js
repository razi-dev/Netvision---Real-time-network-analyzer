/**
 * ConnectivityData Model
 * Stores network measurement data points
 */

const mongoose = require('mongoose');

const connectivityDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  qualityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  // Radio metrics (optional for Wi-Fi)
  rsrq: {
    type: Number,
    required: false,
    min: -20,
    max: -3
  },
  sinr: {
    type: Number,
    required: false,
    min: -10,
    max: 30
  },
  cqi: {
    type: Number,
    required: false,
    min: 0,
    max: 15
  },
  // Network performance
  downloadSpeed: {
    type: Number, // Mbps
    min: 0
  },
  uploadSpeed: {
    type: Number, // Mbps
    min: 0
  },
  latency: {
    type: Number, // ms
    min: 0
  },
  // Network provider information
  provider: {
    type: String,
    enum: ['Airtel', 'Jio', 'Vi', 'BSNL', 'Idea', 'Vodafone', 'Other'],
    default: 'Other'
  },
  // Network type (wifi, cellular, unknown)
  networkType: {
    type: String,
    enum: ['wifi', 'cellular', 'unknown'],
    default: 'unknown'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
connectivityDataSchema.index({ location: '2dsphere' });

// Compound index for user + timestamp queries
connectivityDataSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ConnectivityData', connectivityDataSchema);