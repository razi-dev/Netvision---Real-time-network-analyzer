/**
 * Unit Tests for Quality Score Calculation
 */

const {
  calculateQualityScore,
  getSignalQuality,
  normalizeMetrics,
  analyzeMetrics,
  predictSignalStrength
} = require('../../src/utils/qualityScore');

describe('Quality Score Utilities', () => {
  
  describe('calculateQualityScore', () => {
    test('should calculate quality score with valid metrics', () => {
      const score = calculateQualityScore(-10, 5, 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(typeof score).toBe('number');
    });

    test('should throw error with invalid RSRQ', () => {
      expect(() => calculateQualityScore(-25, 5, 10)).toThrow('RSRQ out of range');
      expect(() => calculateQualityScore(0, 5, 10)).toThrow('RSRQ out of range');
    });

    test('should throw error with invalid SINR', () => {
      expect(() => calculateQualityScore(-10, -20, 10)).toThrow('SINR out of range');
      expect(() => calculateQualityScore(-10, 40, 10)).toThrow('SINR out of range');
    });

    test('should throw error with invalid CQI', () => {
      expect(() => calculateQualityScore(-10, 5, -1)).toThrow('CQI out of range');
      expect(() => calculateQualityScore(-10, 5, 20)).toThrow('CQI out of range');
    });

    test('should throw error with non-numeric input', () => {
      expect(() => calculateQualityScore('invalid', 5, 10)).toThrow('Invalid radio metrics');
      expect(() => calculateQualityScore(-10, null, 10)).toThrow('Invalid radio metrics');
    });

    test('should return higher score with better metrics', () => {
      const poorScore = calculateQualityScore(-18, -5, 2);
      const goodScore = calculateQualityScore(-8, 15, 12);
      expect(goodScore).toBeGreaterThan(poorScore);
    });

    test('should handle edge cases', () => {
      const minScore = calculateQualityScore(-20, -10, 0);
      const maxScore = calculateQualityScore(-3, 30, 15);
      expect(minScore).toBeGreaterThanOrEqual(0);
      expect(maxScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getSignalQuality', () => {
    test('should return "Excellent" for score >= 80', () => {
      expect(getSignalQuality(80)).toBe('Excellent');
      expect(getSignalQuality(100)).toBe('Excellent');
    });

    test('should return "Good" for score 60-79', () => {
      expect(getSignalQuality(60)).toBe('Good');
      expect(getSignalQuality(79)).toBe('Good');
    });

    test('should return "Fair" for score 40-59', () => {
      expect(getSignalQuality(40)).toBe('Fair');
      expect(getSignalQuality(59)).toBe('Fair');
    });

    test('should return "Poor" for score 20-39', () => {
      expect(getSignalQuality(20)).toBe('Poor');
      expect(getSignalQuality(39)).toBe('Poor');
    });

    test('should return "Very Poor" for score < 20', () => {
      expect(getSignalQuality(0)).toBe('Very Poor');
      expect(getSignalQuality(19)).toBe('Very Poor');
    });
  });

  describe('normalizeMetrics', () => {
    test('should normalize all metrics to 0-100 scale', () => {
      const result = normalizeMetrics(-10, 10, 8);
      expect(result.rsrqNormalized).toBeGreaterThanOrEqual(0);
      expect(result.rsrqNormalized).toBeLessThanOrEqual(100);
      expect(result.sinrNormalized).toBeGreaterThanOrEqual(0);
      expect(result.sinrNormalized).toBeLessThanOrEqual(100);
      expect(result.cqiNormalized).toBeGreaterThanOrEqual(0);
      expect(result.cqiNormalized).toBeLessThanOrEqual(100);
    });

    test('should return object with correct properties', () => {
      const result = normalizeMetrics(-10, 10, 8);
      expect(result).toHaveProperty('rsrqNormalized');
      expect(result).toHaveProperty('sinrNormalized');
      expect(result).toHaveProperty('cqiNormalized');
    });
  });

  describe('analyzeMetrics', () => {
    test('should provide analysis for each metric', () => {
      const result = analyzeMetrics(-10, 10, 8);
      expect(result).toHaveProperty('rsrq');
      expect(result).toHaveProperty('sinr');
      expect(result).toHaveProperty('cqi');
    });

    test('should include value, description, and recommendation', () => {
      const result = analyzeMetrics(-10, 10, 8);
      expect(result.rsrq).toHaveProperty('value');
      expect(result.rsrq).toHaveProperty('description');
      expect(result.rsrq).toHaveProperty('recommendation');
    });

    test('should correctly identify weak signal', () => {
      const result = analyzeMetrics(-18, 5, 2);
      expect(result.rsrq.description).toBe('Weak');
      expect(result.sinr.description).toContain('interference');
    });
  });

  describe('predictSignalStrength', () => {
    test('should handle empty array', () => {
      const result = predictSignalStrength([]);
      expect(result.trend).toBe('insufficient');
      expect(result.average).toBe(0);
    });

    test('should return correct statistics', () => {
      const scores = [50, 60, 70, 80, 90];
      const result = predictSignalStrength(scores);
      expect(result.average).toBe(70);
      expect(result.min).toBe(50);
      expect(result.max).toBe(90);
    });

    test('should detect improving trend', () => {
      const scores = [20, 25, 30, 35, 75, 80, 85, 90, 95];
      const result = predictSignalStrength(scores);
      expect(result.trend).toBe('improving');
    });

    test('should detect degrading trend', () => {
      const scores = [95, 90, 85, 80, 75, 30, 25, 20, 15];
      const result = predictSignalStrength(scores);
      expect(result.trend).toBe('degrading');
    });
  });
});