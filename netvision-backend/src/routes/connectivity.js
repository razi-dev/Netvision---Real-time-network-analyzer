const express = require('express');
const router = express.Router();
const connectivityController = require('../controllers/ConnecitivityController');
const towersController = require('../controllers/towersController');
const coverageController = require('../controllers/coverageController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiter for measurement endpoints
const measurementLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 measurements per minute
  message: { success: false, message: 'Measurement rate limit exceeded' }
});

/**
 * POST /api/connectivity/measure
 * Record a single measurement
 */
router.post(
  '/measure',
  authenticateToken,
  measurementLimiter,
  validate('measurement'),
  connectivityController.recordMeasurement
);

/**
 * GET /api/connectivity/best-zone
 * Find best connectivity zone near current location
 */
router.get(
  '/best-zone',
  authenticateToken,
  validate('bestZone'),
  connectivityController.findBestZone
);

/**
 * GET /api/connectivity/offline-fallback
 * Get offline fallback information
 */
router.get(
  '/offline-fallback',
  authenticateToken,
  connectivityController.getOfflineFallback
);

/**
 * GET /api/connectivity/history
 * Get measurement history for user
 */
router.get('/history', authenticateToken, connectivityController.getHistory);

/**
 * DELETE /api/connectivity/history/:measurementId
 * Delete a specific measurement from history
 */
router.delete('/history/:measurementId', authenticateToken, connectivityController.deleteMeasurement);

/**
 * GET /api/connectivity/last-spot
 * Get last recorded measurement spot
 */
router.get('/last-spot', authenticateToken, connectivityController.getLastSpot);

/**
 * POST /api/connectivity/save-spot
 * Save a favorite connectivity spot
 */
router.post(
  '/save-spot',
  authenticateToken,
  validate('saveSpot'),
  connectivityController.saveSpot
);

/**
 * GET /api/connectivity/saved-spots
 * Get all saved spots for user
 */
router.get('/saved-spots', authenticateToken, connectivityController.getSavedSpots);

/**
 * DELETE /api/connectivity/saved-spots/:spotId
 * Delete a saved spot
 */
router.delete('/saved-spots/:spotId', authenticateToken, connectivityController.deleteSpot);

/**
 * GET /api/connectivity/towers
 * Get nearby cell towers based on MCC, MNC, LAC, CID
 */
router.get('/towers', authenticateToken, towersController.getTowers);

/**
 * GET /api/connectivity/towers/location/:locationName
 * Get towers by district/location name
 */
router.get('/towers/location/:locationName', authenticateToken, towersController.getTowersByLocation);

/**
 * GET /api/connectivity/coverage
 * Get coverage data for heatmap visualization
 * No authentication required - public endpoint
 */
router.get('/coverage', coverageController.getCoverageData);

/**
 * GET /api/connectivity/coverage/stats
 * Get coverage statistics by provider
 * No authentication required - public endpoint
 */
router.get('/coverage/stats', coverageController.getCoverageStats);

module.exports = router;