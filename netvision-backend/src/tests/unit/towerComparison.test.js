/**
 * Unit Tests for Tower Comparison
 */

const { compareWithTowerMetrics } = require('../../src/utils/towerComparison');

describe('Tower Comparison Utilities', () => {

  describe('compareWithTowerMetrics', () => {
    test('should return null when tower has no calibration data', () => {
      const measurement = { rsrq: -10, sinr: 10, cqi: 8 };
      const tower = { towerId: 'TOWER1', location: {} };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result).toBeNull();
    });

    test('should compare measurement with tower calibration', () => {
      const measurement = { rsrq: -12, sinr: 8, cqi: 7 };
      const tower = {
        towerId: 'TOWER1',
        calibration: {
          expectedRsrq: -8,
          expectedSinr: 15,
          expectedCqi: 10,
          qualityScore: 75
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('currentScore');
      expect(result).toHaveProperty('towerScore');
      expect(result).toHaveProperty('difference');
    });

    test('should calculate if tower is better than measurement', () => {
      const measurement = { rsrq: -15, sinr: 5, cqi: 5 };
      const tower = {
        calibration: {
          expectedRsrq: -8,
          expectedSinr: 15,
          expectedCqi: 12,
          qualityScore: 80
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result.isBetter).toBe(true);
      expect(result.difference).toBeGreaterThan(0);
    });

    test('should calculate if tower is worse than measurement', () => {
      const measurement = { rsrq: -8, sinr: 20, cqi: 12 };
      const tower = {
        calibration: {
          expectedRsrq: -15,
          expectedSinr: 5,
          expectedCqi: 5,
          qualityScore: 40
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result.isWorse).toBe(true);
      expect(result.difference).toBeLessThan(0);
    });

    test('should handle equal scores', () => {
      const measurement = { rsrq: -10, sinr: 10, cqi: 8 };
      const tower = {
        calibration: {
          expectedRsrq: -10,
          expectedSinr: 10,
          expectedCqi: 8
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result.isEqual).toBe(true);
      expect(result.difference).toBe(0);
    });

    test('should include metric differences in details', () => {
      const measurement = { rsrq: -12, sinr: 8, cqi: 7 };
      const tower = {
        calibration: {
          expectedRsrq: -8,
          expectedSinr: 15,
          expectedCqi: 10
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result).toHaveProperty('details');
      expect(result.details).toHaveProperty('rsrqDifference');
      expect(result.details).toHaveProperty('sinrDifference');
      expect(result.details).toHaveProperty('cqiDifference');
      
      expect(result.details.rsrqDifference).toBe(-8 - (-12)); // 4
      expect(result.details.sinrDifference).toBe(15 - 8); // 7
      expect(result.details.cqiDifference).toBe(10 - 7); // 3
    });

    test('should use tower qualityScore if provided', () => {
      const measurement = { rsrq: -10, sinr: 10, cqi: 8 };
      const tower = {
        calibration: {
          expectedRsrq: -8,
          expectedSinr: 15,
          expectedCqi: 10,
          qualityScore: 85 // Pre-calculated score
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result.towerScore).toBe(85);
    });

    test('should calculate tower score if not provided', () => {
      const measurement = { rsrq: -10, sinr: 10, cqi: 8 };
      const tower = {
        calibration: {
          expectedRsrq: -8,
          expectedSinr: 15,
          expectedCqi: 10
          // No qualityScore provided
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result.towerScore).toBeGreaterThan(0);
      expect(result.towerScore).toBeLessThanOrEqual(100);
    });

    test('should handle edge case metrics', () => {
      const measurement = { rsrq: -20, sinr: -10, cqi: 0 };
      const tower = {
        calibration: {
          expectedRsrq: -3,
          expectedSinr: 30,
          expectedCqi: 15,
          qualityScore: 100
        }
      };
      
      const result = compareWithTowerMetrics(measurement, tower);
      expect(result).not.toBeNull();
      expect(result.isBetter).toBe(true);
      expect(result.difference).toBeGreaterThan(50);
    });
  });
});