/**
 * Human-Friendly Message Generation
 */

const { getSignalQuality } = require('./qualityScore');

/**
 * Generate a human-friendly message based on metrics
 */
function generateHumanMessage(qualityScore, rsrq, sinr, cqi) {
  const quality = getSignalQuality(qualityScore);
  const messages = [];

  // Quality assessment
  if (qualityScore >= 80) {
    messages.push('Your connection is excellent');
  } else if (qualityScore >= 60) {
    messages.push('Your connection is good');
  } else if (qualityScore >= 40) {
    messages.push('Your connection is fair');
  } else if (qualityScore >= 20) {
    messages.push('Your connection is poor');
  } else {
    messages.push('Your connection is very poor');
  }

  // Signal strength analysis
  if (Math.abs(rsrq) < 10) {
    messages.push('Signal strength is strong');
  } else if (Math.abs(rsrq) < 15) {
    messages.push('Signal strength is moderate');
  } else {
    messages.push('Signal strength is weak');
  }

  // Noise analysis
  if (sinr > 10) {
    messages.push('Noise levels are low');
  } else if (sinr > 0) {
    messages.push('Noise levels are moderate');
  } else {
    messages.push('Noise levels are high');
  }

  // Channel quality analysis
  if (cqi >= 12) {
    messages.push('Channel quality is excellent');
  } else if (cqi >= 8) {
    messages.push('Channel quality is good');
  } else if (cqi >= 4) {
    messages.push('Channel quality is fair');
  } else {
    messages.push('Channel quality is poor');
  }

  // Actionable advice
  if (qualityScore < 40) {
    if (sinr < 0) {
      messages.push('Consider moving to reduce interference');
    }
    if (Math.abs(rsrq) > 12) {
      messages.push('Try getting closer to a cell tower');
    }
  } else if (qualityScore >= 80) {
    messages.push('This is a great location for connectivity');
  }

  return messages.join('. ') + '.';
}

/**
 * Generate offline message
 */
function generateOfflineMessage(locationName, bearing, distance, quality) {
  const direction = require('./geoUtils').getCompassDirection(bearing);
  const formattedDistance = require('./geoUtils').formatDistance(distance);

  return `You are offline. The latest best availability zone is ${locationName} — bearing ${bearing}° (${direction}), distance ${formattedDistance}. Expected quality: ${quality}/100.`;
}

module.exports = {
  generateHumanMessage,
  generateOfflineMessage
};