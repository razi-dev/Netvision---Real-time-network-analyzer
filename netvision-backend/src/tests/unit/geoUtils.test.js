/**
 * Unit Tests for Geospatial Utilities
 */

const {
  calculateDistance,
  calculateBearing,
  getCompassDirection,
  formatDistance,
  isValidCoordinate
} = require('../../src/utils/geoUtils');

describe('Geospatial Utilities', () => {

  describe('calculateDistance', () => {
    test('should calculate distance between two coordinates', () => {
      // New York to Los Angeles (approximately 3944 km)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900000); // ~3900 km in meters
      expect(distance).toBeLessThan(4000000);
    });

    test('should return 0 for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    test('should handle different hemispheres', () => {
      // London to Sydney (approximately 17,000 km)
      const distance = calculateDistance(51.5074, -0.1278, -33.8688, 151.2093);
      expect(distance).toBeGreaterThan(17000000);
      expect(distance).toBeLessThan(18000000);
    });

    test('should return positive distance', () => {
      const distance = calculateDistance(-10, -20, 10, 20);
      expect(distance).toBeGreaterThan(0);
    });

    test('should calculate short distances accurately', () => {
      // 1 km difference
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0160);
      expect(distance).toBeGreaterThan(800);
      expect(distance).toBeLessThan(1200);
    });

    test('should handle equator crossing', () => {
      const distance = calculateDistance(-1, 0, 1, 0);
      expect(distance).toBeGreaterThan(220000); // ~222 km
      expect(distance).toBeLessThan(225000);
    });
  });

  describe('calculateBearing', () => {
    test('should calculate bearing between two points', () => {
      const bearing = calculateBearing(0, 0, 1, 1);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThanOrEqual(360);
    });

    test('should return 0 for north direction', () => {
      const bearing = calculateBearing(0, 0, 1, 0);
      expect(bearing).toBe(0);
    });

    test('should return 90 for east direction', () => {
      const bearing = calculateBearing(0, 0, 0, 1);
      expect(bearing).toBe(90);
    });

    test('should return 180 for south direction', () => {
      const bearing = calculateBearing(0, 0, -1, 0);
      expect(bearing).toBe(180);
    });

    test('should return 270 for west direction', () => {
      const bearing = calculateBearing(0, 0, 0, -1);
      expect(bearing).toBe(270);
    });

    test('should always return value between 0-360', () => {
      for (let i = 0; i < 10; i++) {
        const lat1 = Math.random() * 180 - 90;
        const lon1 = Math.random() * 360 - 180;
        const lat2 = Math.random() * 180 - 90;
        const lon2 = Math.random() * 360 - 180;
        const bearing = calculateBearing(lat1, lon1, lat2, lon2);
        expect(bearing).toBeGreaterThanOrEqual(0);
        expect(bearing).toBeLessThan(360);
      }
    });

    test('should return integer value', () => {
      const bearing = calculateBearing(40.7128, -74.0060, 34.0522, -118.2437);
      expect(bearing).toBe(Math.floor(bearing));
    });
  });

  describe('getCompassDirection', () => {
    test('should return N for 0 degrees', () => {
      expect(getCompassDirection(0)).toBe('N');
    });

    test('should return E for 90 degrees', () => {
      expect(getCompassDirection(90)).toBe('E');
    });

    test('should return S for 180 degrees', () => {
      expect(getCompassDirection(180)).toBe('S');
    });

    test('should return W for 270 degrees', () => {
      expect(getCompassDirection(270)).toBe('W');
    });

    test('should return NE for 45 degrees', () => {
      expect(getCompassDirection(45)).toBe('NE');
    });

    test('should return SE for 135 degrees', () => {
      expect(getCompassDirection(135)).toBe('SE');
    });

    test('should return SW for 225 degrees', () => {
      expect(getCompassDirection(225)).toBe('SW');
    });

    test('should return NW for 315 degrees', () => {
      expect(getCompassDirection(315)).toBe('NW');
    });

    test('should handle bearing >= 360 with modulo', () => {
      expect(getCompassDirection(360)).toBe('N');
      expect(getCompassDirection(450)).toBe('E');
    });

    test('should return one of 16 compass directions', () => {
      const validDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      for (let bearing = 0; bearing < 360; bearing += 15) {
        const direction = getCompassDirection(bearing);
        expect(validDirections).toContain(direction);
      }
    });
  });

  describe('formatDistance', () => {
    test('should format meters for distances < 1000', () => {
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    test('should format kilometers for distances >= 1000', () => {
      expect(formatDistance(1000)).toBe('1.00 km');
      expect(formatDistance(1500)).toBe('1.50 km');
      expect(formatDistance(5432)).toBe('5.43 km');
    });

    test('should round meters to integer', () => {
      expect(formatDistance(123.456)).toBe('123 m');
      expect(formatDistance(789.999)).toBe('790 m');
    });

    test('should show 2 decimal places for kilometers', () => {
      expect(formatDistance(12345)).toBe('12.35 km');
      expect(formatDistance(99999)).toBe('100.00 km');
    });

    test('should handle zero distance', () => {
      expect(formatDistance(0)).toBe('0 m');
    });

    test('should handle very large distances', () => {
      expect(formatDistance(1000000)).toBe('1000.00 km');
    });
  });

  describe('isValidCoordinate', () => {
    test('should return true for valid coordinates', () => {
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(40.7128, -74.0060)).toBe(true);
      expect(isValidCoordinate(-33.8688, 151.2093)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
    });

    test('should return false for invalid latitude', () => {
      expect(isValidCoordinate(91, 0)).toBe(false);
      expect(isValidCoordinate(-91, 0)).toBe(false);
      expect(isValidCoordinate(100, 0)).toBe(false);
    });

    test('should return false for invalid longitude', () => {
      expect(isValidCoordinate(0, 181)).toBe(false);
      expect(isValidCoordinate(0, -181)).toBe(false);
      expect(isValidCoordinate(0, 200)).toBe(false);
    });

    test('should return false for both invalid', () => {
      expect(isValidCoordinate(100, 200)).toBe(false);
      expect(isValidCoordinate(-100, -200)).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(89.999, 179.999)).toBe(true);
    });
  });
});