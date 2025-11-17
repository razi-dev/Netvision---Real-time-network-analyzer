/**
 * Tower Model
 * Cell tower/base station data
 */

const mongoose = require('mongoose');

const towerSchema = new mongoose.Schema({
  towerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    trim: true
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
  operator: {
    type: String,
    required: true,
    enum: ['Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'Other']
  },
  frequencyBands: [{
    type: String // e.g., "Band 71 (600 MHz)", "n41 (2.5 GHz)"
  }],
  // Optional calibration values (average expected metrics)
  calibration: {
    expectedRsrq: {
      type: Number,
      min: -20,
      max: -3
    },
    expectedSinr: {
      type: Number,
      min: -10,
      max: 30
    },
    expectedCqi: {
      type: Number,
      min: 0,
      max: 15
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
towerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Tower', towerSchema);