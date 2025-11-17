const Tower = require('../models/Tower');
const { calculateDistance, isValidCoordinate } = require('../utils/geoUtils');
const { compareWithTowerMetrics } = require('../utils/towerComparison');
const CONSTANTS = require('../config/constants');

/**
 * Get nearby towers
 */
exports.getNearbyTowers = async (req, res, next) => {
  try {
    const { latitude, longitude, radius } = req.query;

    if (!isValidCoordinate(parseFloat(latitude), parseFloat(longitude))) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    const radiusMeters = Math.min(
      parseInt(radius) || CONSTANTS.GEO.DEFAULT_RADIUS_M,
      CONSTANTS.GEO.MAX_RADIUS_M
    );

    const towers = await Tower.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radiusMeters
        }
      }
    }).limit(10);

    const formatted = towers.map(tower => ({
      id: tower._id,
      towerId: tower.towerId,
      name: tower.name,
      location: {
        latitude: tower.location.coordinates[1],
        longitude: tower.location.coordinates[0]
      },
      operator: tower.operator,
      frequencyBands: tower.frequencyBands,
      calibration: tower.calibration,
      distance: calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        tower.location.coordinates[1],
        tower.location.coordinates[0]
      )
    }));

    res.status(200).json({
      success: true,
      data: formatted,
      count: formatted.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tower by ID
 */
exports.getTowerById = async (req, res, next) => {
  try {
    const { towerId } = req.params;

    const tower = await Tower.findById(towerId);

    if (!tower) {
      return res.status(404).json({ success: false, message: 'Tower not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: tower._id,
        towerId: tower.towerId,
        name: tower.name,
        location: {
          latitude: tower.location.coordinates[1],
          longitude: tower.location.coordinates[0]
        },
        operator: tower.operator,
        frequencyBands: tower.frequencyBands,
        calibration: tower.calibration,
        lastUpdated: tower.lastUpdated
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add new tower (admin only - would need auth middleware)
 */
exports.addTower = async (req, res, next) => {
  try {
    const { towerId, name, latitude, longitude, operator, frequencyBands, calibration } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // Check if tower exists
    const exists = await Tower.findOne({ towerId });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Tower already exists' });
    }

    const tower = new Tower({
      towerId,
      name,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      operator,
      frequencyBands: frequencyBands || [],
      calibration: calibration || {}
    });

    await tower.save();

    res.status(201).json({
      success: true,
      message: 'Tower added successfully',
      data: {
        id: tower._id,
        towerId: tower.towerId,
        name: tower.name,
        location: { latitude, longitude }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tower calibration
 */
exports.updateTowerCalibration = async (req, res, next) => {
  try {
    const { towerId } = req.params;
    const { expectedRsrq, expectedSinr, expectedCqi, qualityScore } = req.body;

    const tower = await Tower.findById(towerId);

    if (!tower) {
      return res.status(404).json({ success: false, message: 'Tower not found' });
    }

    tower.calibration = {
      expectedRsrq: expectedRsrq || tower.calibration?.expectedRsrq,
      expectedSinr: expectedSinr || tower.calibration?.expectedSinr,
      expectedCqi: expectedCqi || tower.calibration?.expectedCqi,
      qualityScore: qualityScore || tower.calibration?.qualityScore
    };
    tower.lastUpdated = new Date();

    await tower.save();

    res.status(200).json({
      success: true,
      message: 'Tower calibration updated',
      data: tower.calibration
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add towers from data source
 */
exports.bulkAddTowers = async (req, res, next) => {
  try {
    const { towers } = req.body;

    if (!Array.isArray(towers)) {
      return res.status(400).json({ success: false, message: 'Expected array of towers' });
    }

    const validTowers = towers.filter(t =>
      t.towerId && isValidCoordinate(t.latitude, t.longitude)
    );

    const results = {
      added: 0,
      skipped: 0,
      errors: []
    };

    for (const towerData of validTowers) {
      try {
        const exists = await Tower.findOne({ towerId: towerData.towerId });

        if (exists) {
          results.skipped++;
          continue;
        }

        const tower = new Tower({
          towerId: towerData.towerId,
          name: towerData.name,
          location: {
            type: 'Point',
            coordinates: [towerData.longitude, towerData.latitude]
          },
          operator: towerData.operator || 'Other',
          frequencyBands: towerData.frequencyBands || [],
          calibration: towerData.calibration || {}
        });

        await tower.save();
        results.added++;
      } catch (error) {
        results.errors.push({
          towerId: towerData.towerId,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk tower import completed',
      results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Compare measurement with nearby tower metrics
 */
exports.compareMeasurementWithTower = async (req, res, next) => {
  try {
    const { latitude, longitude, rsrq, sinr, cqi } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // Find nearest tower
    const tower = await Tower.findOne({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        }
      }
    });

    if (!tower || !tower.calibration) {
      return res.status(404).json({
        success: false,
        message: 'No tower with calibration data found nearby'
      });
    }

    const measurement = { rsrq, sinr, cqi };
    const comparison = compareWithTowerMetrics(measurement, tower);

    res.status(200).json({
      success: true,
      data: {
        tower: {
          id: tower._id,
          towerId: tower.towerId,
          name: tower.name
        },
        comparison
      }
    });
  } catch (error) {
    next(error);
  }
};