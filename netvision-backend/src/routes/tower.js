const express = require('express');
const router = express.Router();
const towerController = require('../controllers/towerController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/towers/nearby
 * Get towers near specified coordinates
 */
router.get('/nearby', towerController.getNearbyTowers);

/**
 * GET /api/towers/:towerId
 * Get specific tower by ID
 */
router.get('/:towerId', towerController.getTowerById);

/**
 * POST /api/towers
 * Add new tower (admin only)
 */
router.post('/', authenticateToken, towerController.addTower);

/**
 * PATCH /api/towers/:towerId/calibration
 * Update tower calibration data
 */
router.patch(
  '/:towerId/calibration',
  authenticateToken,
  towerController.updateTowerCalibration
);

/**
 * POST /api/towers/bulk
 * Bulk import towers
 */
router.post('/bulk/import', authenticateToken, towerController.bulkAddTowers);

/**
 * POST /api/towers/compare
 * Compare measurement with nearby tower metrics
 */
router.post('/compare', towerController.compareMeasurementWithTower);

module.exports = router;