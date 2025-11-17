/**
 * Jest Test Setup Configuration
 */

const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_do_not_use_in_production';
process.env.MONGODB_URI = 'mongodb://localhost:27017/netvision-test';

// Increase Jest timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Clean up after all tests
afterAll(async () => {
  await mongoose.disconnect();
});