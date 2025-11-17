const ConnectivityData = require('../models/ConnectivityData');
const SavedSpot = require('../models/SavedSpot');
const Tower = require('../models/Tower');
const { calculateQualityScore, calculateEnhancedQualityScore, calculateWiFiQualityScore, generateWiFiMessage } = require('../Utils/qualityScore');
const {
  calculateDistance,
  calculateBearing,
  getCompassDirection,
  formatDistance,
  isValidCoordinate
} = require('../Utils/geoUtils');
const { generateHumanMessage, generateOfflineMessage } = require('../Utils/messageGenerator');
const { compareWithTowerMetrics } = require('../Utils/towerComparison');
const CONSTANTS = require('../config/constants');
const axios = require('axios');

/**
 * Record a single measurement
 */
exports.recordMeasurement = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { rsrq, sinr, cqi, latitude, longitude, downloadSpeed, uploadSpeed, latency, saveOnStop, provider, networkType } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // Calculate quality score based on network type
    let qualityScore;
    let message;
    
    if (networkType === 'wifi') {
      // For Wi-Fi, ignore radio metrics and use only speed/latency
      qualityScore = calculateWiFiQualityScore(downloadSpeed, uploadSpeed, latency);
      message = generateWiFiMessage(qualityScore, downloadSpeed, uploadSpeed, latency);
    } else {
      // For cellular, use enhanced scoring with radio metrics
      qualityScore = (downloadSpeed > 0 || uploadSpeed > 0) 
        ? calculateEnhancedQualityScore(rsrq, sinr, cqi, downloadSpeed, uploadSpeed)
        : calculateQualityScore(rsrq, sinr, cqi);
      message = generateHumanMessage(qualityScore, rsrq, sinr, cqi);
    }

    // Save if requested
    if (saveOnStop) {
      const connectivity = new ConnectivityData({
        userId,
        location: { type: 'Point', coordinates: [longitude, latitude] },
        qualityScore,
        rsrq: networkType === 'wifi' ? null : rsrq, // Don't save radio metrics for Wi-Fi
        sinr: networkType === 'wifi' ? null : sinr,
        cqi: networkType === 'wifi' ? null : cqi,
        downloadSpeed: downloadSpeed || 0,
        uploadSpeed: uploadSpeed || 0,
        latency: latency || 0,
        provider: provider || 'Other',
        networkType: networkType || 'unknown'
      });
      await connectivity.save();
    }

    // Find best zone
    const bestZone = await findBestZoneHelper(userId, latitude, longitude);

    res.status(200).json({
      success: true,
      message: 'Measurement recorded',
      data: {
        qualityScore,
        humanMessage: message,
        downloadSpeed: downloadSpeed || 0,
        uploadSpeed: uploadSpeed || 0,
        latency: latency || 0,
        bestZone: bestZone || { hasData: false },
        metrics: { rsrq, sinr, cqi, downloadSpeed: downloadSpeed || 0, uploadSpeed: uploadSpeed || 0, latency: latency || 0 }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Find best zone near location
 */
async function findBestZoneHelper(userId, latitude, longitude, radiusMeters = CONSTANTS.GEO.DEFAULT_RADIUS_M) {
  radiusMeters = Math.min(radiusMeters, CONSTANTS.GEO.MAX_RADIUS_M);

  const nearbyData = await ConnectivityData.findOne({
    userId,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusMeters
      }
    }
  }).sort({ qualityScore: -1 });

  if (!nearbyData) {
    return { hasData: false };
  }

  const [spotLon, spotLat] = nearbyData.location.coordinates;
  const distance = calculateDistance(latitude, longitude, spotLat, spotLon);
  const bearing = calculateBearing(latitude, longitude, spotLat, spotLon);
  const direction = getCompassDirection(bearing);

  return {
    hasData: true,
    bearing,
    bearingDirection: direction,
    distance,
    distanceFormatted: formatDistance(distance),
    qualityScore: nearbyData.qualityScore,
    location: { latitude: spotLat, longitude: spotLon },
    recommendation: `Move ${direction} (${bearing}°) for ${distance > 100 ? formatDistance(distance) : 'nearby'} better signal`
  };
}

/**
 * Find best zone endpoint
 */
exports.findBestZone = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude, radius } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    const result = await findBestZoneHelper(
      userId,
      latitude,
      longitude,
      radius || CONSTANTS.GEO.DEFAULT_RADIUS_M
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get offline fallback information
 */
exports.getOfflineFallback = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude } = req.query;

    let bestZone;

    if (latitude && longitude) {
      if (!isValidCoordinate(parseFloat(latitude), parseFloat(longitude))) {
        return res.status(400).json({ success: false, message: 'Invalid coordinates' });
      }
      bestZone = await findBestZoneHelper(userId, parseFloat(latitude), parseFloat(longitude));
    } else {
      // Get last recorded location
      const lastData = await ConnectivityData.findOne({ userId }).sort({ timestamp: -1 });
      if (lastData) {
        const [lon, lat] = lastData.location.coordinates;
        bestZone = await findBestZoneHelper(userId, lat, lon);
      } else {
        bestZone = { hasData: false };
      }
    }

    if (!bestZone.hasData) {
      return res.status(200).json({
        success: true,
        data: { hasData: false, message: 'No offline zones available' }
      });
    }

    const offlineMessage = generateOfflineMessage(
      bestZone.location?.name || 'Unknown Zone',
      bestZone.bearing,
      bestZone.distance,
      bestZone.qualityScore
    );

    res.status(200).json({
      success: true,
      data: {
        hasData: true,
        message: offlineMessage,
        zone: bestZone
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get connectivity history
 */
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    const data = await ConnectivityData.find({ userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await ConnectivityData.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific measurement
 */
exports.deleteMeasurement = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { measurementId } = req.params;

    const measurement = await ConnectivityData.findOne({
      _id: measurementId,
      userId: userId
    });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    await ConnectivityData.findByIdAndDelete(measurementId);

    res.status(200).json({
      success: true,
      message: 'Measurement deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get last recorded spot
 */
exports.getLastSpot = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const lastData = await ConnectivityData.findOne({ userId }).sort({ timestamp: -1 });

    if (!lastData) {
      return res.status(404).json({ success: false, message: 'No data found' });
    }

    const [lon, lat] = lastData.location.coordinates;

    res.status(200).json({
      success: true,
      data: {
        location: { latitude: lat, longitude: lon },
        qualityScore: lastData.qualityScore,
        rsrq: lastData.rsrq,
        sinr: lastData.sinr,
        cqi: lastData.cqi,
        timestamp: lastData.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save a favorite spot
 */
exports.saveSpot = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { locationName, latitude, longitude, notes } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates' });
    }

    // Get current quality (default if not available)
    const qualityScore = 75;

    const spot = new SavedSpot({
      userId,
      locationName,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      qualityScore,
      notes
    });

    await spot.save();

    res.status(201).json({
      success: true,
      message: 'Spot saved successfully',
      data: {
        id: spot._id,
        locationName: spot.locationName,
        location: { latitude, longitude },
        qualityScore: spot.qualityScore,
        timestamp: spot.timestamp
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all saved spots for user
 */
exports.getSavedSpots = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const spots = await SavedSpot.find({ userId }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: spots.map(spot => ({
        id: spot._id,
        locationName: spot.locationName,
        location: {
          latitude: spot.location.coordinates[1],
          longitude: spot.location.coordinates[0]
        },
        qualityScore: spot.qualityScore,
        notes: spot.notes,
        timestamp: spot.timestamp
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a saved spot
 */
exports.deleteSpot = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { spotId } = req.params;

    const spot = await SavedSpot.findOne({ _id: spotId, userId });

    if (!spot) {
      return res.status(404).json({ success: false, message: 'Spot not found' });
    }

    await SavedSpot.deleteOne({ _id: spotId });

    res.status(200).json({
      success: true,
      message: 'Spot deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};