/**
 * Application Constants
 */

module.exports = {
  // Quality Score Constants
  QUALITY_SCORE: {
    SINR_WEIGHT: 0.5,
    CQI_WEIGHT: 0.3,
    RSRQ_WEIGHT: 0.2,
    MIN_SCORE: 0,
    MAX_SCORE: 100
  },

  // Signal Quality Thresholds
  SIGNAL_QUALITY: {
    EXCELLENT: { min: 80, label: 'Excellent' },
    GOOD: { min: 60, label: 'Good' },
    FAIR: { min: 40, label: 'Fair' },
    POOR: { min: 20, label: 'Poor' },
    VERY_POOR: { min: 0, label: 'Very Poor' }
  },

  // Radio Metric Ranges (typical LTE/5G values)
  RADIO_METRICS: {
    RSRQ: { min: -20, max: -3 },
    SINR: { min: -10, max: 30 },
    CQI: { min: 0, max: 15 }
  },

  // Geolocation
  GEO: {
    DEFAULT_RADIUS_M: 5000,
    MAX_RADIUS_M: 50000,
    EARTH_RADIUS_M: 6371000
  },

  // Measurement Settings
  MEASUREMENT: {
    MIN_INTERVAL_MS: 1000,
    MAX_CONTINUOUS_DURATION_MS: 3600000, // 1 hour
    HISTORY_LIMIT: 100
  },

  // WebSocket
  WS: {
    HEARTBEAT_INTERVAL_MS: 30000,
    MAX_MESSAGE_SIZE: 1048576 // 1MB
  }
};