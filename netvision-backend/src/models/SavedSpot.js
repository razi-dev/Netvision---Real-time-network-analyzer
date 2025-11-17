/**
 * SavedSpot Model
 * User-saved locations with good connectivity
 */

const mongoose = require('mongoose');

const savedSpotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  locationName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
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
  notes: {
    type: String,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
savedSpotSchema.index({ location: '2dsphere' });

// Compound index for user queries
savedSpotSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('SavedSpot', savedSpotSchema);