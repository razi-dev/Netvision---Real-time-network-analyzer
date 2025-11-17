const express = require('express');
const router = express.Router();
const speedTestController = require('../controllers/speedTestController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for speed test endpoints
const speedTestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 speed tests per minute
  message: { success: false, message: 'Speed test rate limit exceeded' }
});

/**
 * GET /api/speedtest/download
 * Download speed test endpoint
 */
router.get(
  '/download',
  authenticateToken,
  speedTestLimiter,
  speedTestController.downloadSpeedTest
);

/**
 * POST /api/speedtest/upload
 * Upload speed test endpoint
 */
router.post(
  '/upload',
  authenticateToken,
  speedTestLimiter,
  speedTestController.uploadSpeedTest
);

/**
 * GET /api/speedtest/combined
 * Combined speed test (download + upload + latency)
 */
router.get(
  '/combined',
  authenticateToken,
  speedTestLimiter,
  speedTestController.combinedSpeedTest
);

/**
 * GET /api/speedtest/ping
 * Latency/ping test endpoint
 */
router.get(
  '/ping',
  authenticateToken,
  speedTestLimiter,
  speedTestController.pingTest
);

module.exports = router;
