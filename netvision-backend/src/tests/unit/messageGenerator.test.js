/**
 * Unit Tests for Message Generator
 */

const {
  generateHumanMessage,
  generateOfflineMessage
} = require('../../src/utils/messageGenerator');

describe('Message Generator', () => {

  describe('generateHumanMessage', () => {
    test('should generate message for excellent connection', () => {
      const message = generateHumanMessage(85, -8, 20, 14);
      expect(message).toContain('excellent');
      expect(typeof message).toBe('string');
      expect(message.endsWith('.')).toBe(true);
    });

    test('should generate message for good connection', () => {
      const message = generateHumanMessage(65, -10, 10, 10);
      expect(message).toContain('good');
      expect(typeof message).toBe('string');
    });

    test('should generate message for fair connection', () => {
      const message = generateHumanMessage(45, -12, 5, 6);
      expect(message).toContain('fair');
    });

    test('should generate message for poor connection', () => {
      const message = generateHumanMessage(25, -15, 0, 3);
      expect(message).toContain('poor');
    });

    test('should generate message for very poor connection', () => {
      const message = generateHumanMessage(10, -18, -5, 1);
      expect(message).toContain('very poor');
    });

    test('should include signal strength information', () => {
      const strongMessage = generateHumanMessage(70, -8, 10, 10);
      const weakMessage = generateHumanMessage(40, -18, 5, 5);
      
      expect(strongMessage).toContain('strong');
      expect(weakMessage).toContain('weak');
    });

    test('should include noise level information', () => {
      const lowNoiseMessage = generateHumanMessage(70, -10, 15, 10);
      const highNoiseMessage = generateHumanMessage(40, -10, -5, 5);
      
      expect(lowNoiseMessage.toLowerCase()).toContain('noise');
      expect(highNoiseMessage.toLowerCase()).toContain('noise');
    });

    test('should include channel quality information', () => {
      const message = generateHumanMessage(70, -10, 10, 12);
      expect(message.toLowerCase()).toContain('channel');
    });

    test('should provide actionable advice for poor connection', () => {
      const message = generateHumanMessage(30, -18, -5, 3);
      expect(message.toLowerCase()).toMatch(/move|consider|try|closer|interference/);
    });

    test('should provide positive feedback for good connection', () => {
      const message = generateHumanMessage(85, -7, 20, 14);
      expect(message.toLowerCase()).toContain('great');
    });

    test('should always return a string', () => {
      const message = generateHumanMessage(50, -10, 5, 8);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    test('should handle edge case metrics', () => {
      expect(() => generateHumanMessage(0, -20, -10, 0)).not.toThrow();
      expect(() => generateHumanMessage(100, -3, 30, 15)).not.toThrow();
    });

    test('should create distinct messages for different quality levels', () => {
      const poor = generateHumanMessage(15, -18, -5, 1);
      const excellent = generateHumanMessage(90, -5, 25, 15);
      expect(poor).not.toBe(excellent);
    });
  });

  describe('generateOfflineMessage', () => {
    test('should generate offline message with all components', () => {
      const message = generateOfflineMessage('Coffee Shop', 45, 1500, 75);
      expect(message).toContain('offline');
      expect(message).toContain('Coffee Shop');
      expect(message).toContain('45');
      expect(message).toContain('75');
    });

    test('should include bearing in message', () => {
      const message = generateOfflineMessage('Tower A', 90, 2000, 80);
      expect(message).toContain('90°');
    });

    test('should include compass direction', () => {
      const message = generateOfflineMessage('Zone B', 45, 3000, 70);
      expect(message).toMatch(/N|NE|E|SE|S|SW|W|NW/);
    });

    test('should include formatted distance', () => {
      const messageMeters = generateOfflineMessage('Spot C', 180, 500, 65);
      const messageKm = generateOfflineMessage('Spot D', 270, 5000, 85);
      
      expect(messageMeters).toContain('m');
      expect(messageKm).toContain('km');
    });

    test('should include quality score', () => {
      const message = generateOfflineMessage('Location E', 0, 1000, 92);
      expect(message).toContain('92');
    });

    test('should format properly for different location names', () => {
      const msg1 = generateOfflineMessage('Downtown Area', 45, 1000, 70);
      const msg2 = generateOfflineMessage('Home', 180, 500, 85);
      
      expect(msg1).toContain('Downtown Area');
      expect(msg2).toContain('Home');
    });

    test('should handle zero bearing (north)', () => {
      const message = generateOfflineMessage('North Tower', 0, 1000, 75);
      expect(message).toContain('0°');
      expect(message).toContain('N');
    });

    test('should handle various bearings correctly', () => {
      const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
      bearings.forEach(bearing => {
        const message = generateOfflineMessage('Test', bearing, 1000, 70);
        expect(message).toContain(`${bearing}°`);
      });
    });

    test('should return string with expected format', () => {
      const message = generateOfflineMessage('Test Location', 90, 2000, 80);
      expect(typeof message).toBe('string');
      expect(message).toMatch(/offline.*best.*zone.*bearing.*distance.*quality/i);
    });
  });
});