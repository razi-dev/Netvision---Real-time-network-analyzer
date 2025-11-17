/**
 * Tower Comparison Utilities
 */

const { calculateQualityScore } = require('./qualityScore');

/**
 * Compare a measurement with tower calibration metrics
 * Returns whether tower is better/worse than measurement
 */
function compareWithTowerMetrics(measurement, tower) {
  if (!tower.calibration) {
    return null; // No calibration data
  }

  const { rsrq, sinr, cqi } = measurement;
  const { expectedRsrq, expectedSinr, expectedCqi, qualityScore: towerQuality } = tower.calibration;

  // Compare quality scores
  const measurementScore = calculateQualityScore(rsrq, sinr, cqi);
  const towerScore = towerQuality || calculateQualityScore(
    expectedRsrq, expectedSinr, expectedCqi
  );

  return {
    currentScore: measurementScore,
    towerScore: towerScore,
    difference: towerScore - measurementScore,
    isBetter: towerScore > measurementScore,
    isWorse: towerScore < measurementScore,
    isEqual: towerScore === measurementScore,
    details: {
      rsrqDifference: expectedRsrq - rsrq,
      sinrDifference: expectedSinr - sinr,
      cqiDifference: expectedCqi - cqi
    }
  };
}

/**
 * Find best tower near location based on quality score
 */
function findBestTowerNearby(towers, measurements = []) {
  if (!towers || towers.length === 0) {
    return null;
  }

  // Calculate average quality for each tower
  const towerScores = towers.map(tower => {
    let score = 0;

    // Use calibration score if available
    if (tower.calibration && tower.calibration.qualityScore) {
      score = tower.calibration.qualityScore;
    } else if (tower.calibration) {
      score = calculateQualityScore(
        tower.calibration.expectedRsrq,
        tower.calibration.expectedSinr,
        tower.calibration.expectedCqi
      );
    }

    // Average with recent measurements if available
    if (measurements.length > 0) {
      const avgMeasurement = measurements.reduce((acc, m) => ({
        rsrq: acc.rsrq + m.rsrq / measurements.length,
        sinr: acc.sinr + m.sinr / measurements.length,
        cqi: acc.cqi + m.cqi / measurements.length
      }), { rsrq: 0, sinr: 0, cqi: 0 });

      const measurementScore = calculateQualityScore(
        avgMeasurement.rsrq,
        avgMeasurement.sinr,
        avgMeasurement.cqi
      );

      score = (score + measurementScore) / 2;
    }

    return {
      tower,
      score: Math.round(score)
    };
  });

  // Sort by score (highest first)
  towerScores.sort((a, b) => b.score - a.score);

  return towerScores[0];
}

module.exports = {
  compareWithTowerMetrics,
  findBestTowerNearby
};