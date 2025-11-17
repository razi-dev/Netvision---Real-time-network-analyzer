/**
 * Quality Score Calculation Utilities
 * Formula: Quality Score = (SINR × 0.5) + (CQI × 0.3) - (|RSRQ| × 0.2)
 * Normalized to 0-100
 */

const CONSTANTS = require('../config/constants');

/**
 * Calculate quality score from radio metrics
 * @param {number} rsrq - Reference Signal Received Quality (-20 to -3)
 * @param {number} sinr - Signal-to-Interference-plus-Noise Ratio (-10 to 30)
 * @param {number} cqi - Channel Quality Indicator (0 to 15)
 * @returns {number} Quality score (0-100)
 */
function calculateQualityScore(rsrq, sinr, cqi) {
  // Validate inputs
  if (
    typeof rsrq !== 'number' ||
    typeof sinr !== 'number' ||
    typeof cqi !== 'number'
  ) {
    throw new Error('Invalid radio metrics - must be numbers');
  }

  if (rsrq < -20 || rsrq > -3) {
    throw new Error('RSRQ out of range: -20 to -3');
  }

  if (sinr < -10 || sinr > 30) {
    throw new Error('SINR out of range: -10 to 30');
  }

  if (cqi < 0 || cqi > 15) {
    throw new Error('CQI out of range: 0 to 15');
  }

  // Apply weights to metrics
  const sinrScore = sinr * CONSTANTS.QUALITY_SCORE.SINR_WEIGHT;
  const cqiScore = (cqi / 15) * 100 * CONSTANTS.QUALITY_SCORE.CQI_WEIGHT;
  const rsrqScore = Math.abs(rsrq) * CONSTANTS.QUALITY_SCORE.RSRQ_WEIGHT;

  // Calculate raw score
  let score = sinrScore + cqiScore - rsrqScore;

  // Normalize to 0-100 range
  score = Math.max(
    CONSTANTS.QUALITY_SCORE.MIN_SCORE,
    Math.min(CONSTANTS.QUALITY_SCORE.MAX_SCORE, score)
  );

  return Math.round(score);
}

/**
 * Get signal quality label based on score
 * @param {number} score - Quality score (0-100)
 * @returns {string} Quality label
 */
function getSignalQuality(score) {
  const { SIGNAL_QUALITY } = CONSTANTS;

  if (score >= SIGNAL_QUALITY.EXCELLENT.min) {
    return SIGNAL_QUALITY.EXCELLENT.label;
  }
  if (score >= SIGNAL_QUALITY.GOOD.min) {
    return SIGNAL_QUALITY.GOOD.label;
  }
  if (score >= SIGNAL_QUALITY.FAIR.min) {
    return SIGNAL_QUALITY.FAIR.label;
  }
  if (score >= SIGNAL_QUALITY.POOR.min) {
    return SIGNAL_QUALITY.POOR.label;
  }
  return SIGNAL_QUALITY.VERY_POOR.label;
}

/**
 * Normalize individual radio metrics to 0-100 scale
 * @param {number} rsrq - Reference Signal Received Quality
 * @param {number} sinr - Signal-to-Interference-plus-Noise Ratio
 * @param {number} cqi - Channel Quality Indicator
 * @returns {object} Normalized metrics
 */
function normalizeMetrics(rsrq, sinr, cqi) {
  return {
    rsrqNormalized: Math.round((Math.abs(rsrq) / 20) * 100),
    sinrNormalized: Math.round(((sinr + 10) / 40) * 100),
    cqiNormalized: Math.round((cqi / 15) * 100)
  };
}

/**
 * Get detailed metric analysis
 * @param {number} rsrq - Reference Signal Received Quality
 * @param {number} sinr - Signal-to-Interference-plus-Noise Ratio
 * @param {number} cqi - Channel Quality Indicator
 * @returns {object} Detailed analysis
 */
function analyzeMetrics(rsrq, sinr, cqi) {
  const analysis = {
    rsrq: {
      value: rsrq,
      description: rsrq > -10 ? 'Strong' : rsrq > -15 ? 'Moderate' : 'Weak',
      recommendation: rsrq < -15 ? 'Move closer to tower' : 'Signal acceptable'
    },
    sinr: {
      value: sinr,
      description: sinr > 10 ? 'Low interference' : sinr > 0 ? 'Moderate interference' : 'High interference',
      recommendation: sinr < 0 ? 'High noise detected, move away from interference sources' : 'Noise levels acceptable'
    },
    cqi: {
      value: cqi,
      description: cqi >= 12 ? 'Excellent' : cqi >= 8 ? 'Good' : cqi >= 4 ? 'Fair' : 'Poor',
      recommendation: cqi < 8 ? 'Channel conditions degraded' : 'Channel quality good'
    }
  };

  return analysis;
}

/**
 * Predict signal strength based on historical data
 * @param {array} historicalScores - Array of historical quality scores
 * @returns {object} Prediction data
 */
function predictSignalStrength(historicalScores) {
  if (!Array.isArray(historicalScores) || historicalScores.length === 0) {
    return { trend: 'insufficient', average: 0 };
  }

  const average = Math.round(
    historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length
  );

  let trend = 'stable';
  if (historicalScores.length >= 2) {
    const recent = historicalScores.slice(-5);
    const older = historicalScores.slice(0, 5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    if (recentAvg > olderAvg + 5) {
      trend = 'improving';
    } else if (recentAvg < olderAvg - 5) {
      trend = 'degrading';
    }
  }

  return {
    average,
    trend,
    min: Math.min(...historicalScores),
    max: Math.max(...historicalScores)
  };
}

/**
 * Calculate enhanced quality score including speed metrics
 * @param {number} rsrq - Reference Signal Received Quality (-20 to -3)
 * @param {number} sinr - Signal-to-Interference-plus-Noise Ratio (-10 to 30)
 * @param {number} cqi - Channel Quality Indicator (0 to 15)
 * @param {number} downloadSpeed - Download speed in Mbps (optional)
 * @param {number} uploadSpeed - Upload speed in Mbps (optional)
 * @returns {number} Enhanced quality score (0-100)
 */
function calculateEnhancedQualityScore(rsrq, sinr, cqi, downloadSpeed = 0, uploadSpeed = 0) {
  // Calculate base signal quality (50% weight)
  const signalQuality = calculateQualityScore(rsrq, sinr, cqi);
  
  // Normalize download speed (0-100 Mbps range) - 30% weight
  const normalizedDownload = Math.min(100, (downloadSpeed / 100) * 100);
  
  // Normalize upload speed (0-50 Mbps range) - 20% weight  
  const normalizedUpload = Math.min(100, (uploadSpeed / 50) * 100);
  
  // Calculate weighted score
  const enhancedScore = (signalQuality * 0.5) + (normalizedDownload * 0.3) + (normalizedUpload * 0.2);
  
  return Math.round(Math.max(0, Math.min(100, enhancedScore)));
}

/**
 * Get speed quality color based on speed value
 * @param {number} speed - Speed in Mbps
 * @param {string} type - 'download' or 'upload'
 * @returns {string} Color code
 */
function getSpeedQualityColor(speed, type = 'download') {
  const thresholds = type === 'download' 
    ? { excellent: 50, good: 10 }
    : { excellent: 25, good: 5 };
    
  if (speed >= thresholds.excellent) return '#00FF94'; // Green
  if (speed >= thresholds.good) return '#FFD700'; // Yellow
  return '#FF4444'; // Red
}

/**
 * Calculate Wi-Fi quality score based only on speed and latency
 * @param {number} downloadSpeed - Download speed in Mbps
 * @param {number} uploadSpeed - Upload speed in Mbps  
 * @param {number} latency - Latency in ms
 * @returns {number} Wi-Fi quality score (0-100)
 */
function calculateWiFiQualityScore(downloadSpeed = 0, uploadSpeed = 0, latency = 0) {
  // Normalize download speed (0-100 Mbps range) - 50% weight
  const normalizedDownload = Math.min(100, (downloadSpeed / 100) * 100);
  
  // Normalize upload speed (0-50 Mbps range) - 30% weight  
  const normalizedUpload = Math.min(100, (uploadSpeed / 50) * 100);
  
  // Normalize latency (lower is better, 0-200ms range) - 20% weight
  const normalizedLatency = Math.max(0, 100 - ((latency / 200) * 100));
  
  // Calculate weighted score
  const wifiScore = (normalizedDownload * 0.5) + (normalizedUpload * 0.3) + (normalizedLatency * 0.2);
  
  return Math.round(Math.max(0, Math.min(100, wifiScore)));
}

/**
 * Generate Wi-Fi specific quality message
 * @param {number} qualityScore - Wi-Fi quality score (0-100)
 * @param {number} downloadSpeed - Download speed in Mbps
 * @param {number} uploadSpeed - Upload speed in Mbps
 * @param {number} latency - Latency in ms
 * @returns {string} Human-readable message
 */
function generateWiFiMessage(qualityScore, downloadSpeed, uploadSpeed, latency) {
  let qualityLabel = 'Poor';
  if (qualityScore >= 80) qualityLabel = 'Excellent';
  else if (qualityScore >= 60) qualityLabel = 'Good';
  else if (qualityScore >= 40) qualityLabel = 'Fair';

  let speedDescription = 'Slow speeds detected.';
  if (downloadSpeed >= 50 && uploadSpeed >= 25) {
    speedDescription = 'Excellent Wi-Fi speeds.';
  } else if (downloadSpeed >= 25 && uploadSpeed >= 10) {
    speedDescription = 'Good Wi-Fi speeds.';
  } else if (downloadSpeed >= 10 && uploadSpeed >= 5) {
    speedDescription = 'Moderate Wi-Fi speeds.';
  }

  let latencyDescription = 'High latency may affect real-time applications.';
  if (latency <= 20) {
    latencyDescription = 'Excellent response time.';
  } else if (latency <= 50) {
    latencyDescription = 'Good response time.';
  } else if (latency <= 100) {
    latencyDescription = 'Moderate response time.';
  }

  return `Your Wi-Fi connection is ${qualityLabel.toLowerCase()}. ${speedDescription} ${latencyDescription}`;
}

module.exports = {
  calculateQualityScore,
  calculateEnhancedQualityScore,
  calculateWiFiQualityScore,
  generateWiFiMessage,
  getSignalQuality,
  getSpeedQualityColor,
  normalizeMetrics,
  analyzeMetrics,
  predictSignalStrength
};