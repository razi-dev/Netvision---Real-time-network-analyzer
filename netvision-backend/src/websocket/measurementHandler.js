/**
 * WebSocket Handler for Continuous Measurements
 * Handles real-time measurement streaming and best-zone recommendations
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ConnectivityData = require('../models/ConnectivityData');
const { calculateQualityScore } = require('../utils/qualityScore');
const {
  calculateDistance,
  calculateBearing,
  getCompassDirection,
  formatDistance,
  isValidCoordinate
} = require('../utils/geoUtils');
const { generateHumanMessage } = require('../utils/messageGenerator');
const CONSTANTS = require('../config/constants');

let wss = null;
const activeConnections = new Map();

/**
 * Initialize WebSocket server for continuous measurements
 * @param {http.Server} server - HTTP server instance
 */
function initWebSocketServer(server) {
  wss = new WebSocket.Server({ 
    server, 
    path: '/ws/measure',
    perMessageDeflate: false,
    maxPayload: CONSTANTS.WS.MAX_MESSAGE_SIZE
  });

  wss.on('connection', handleConnection);
  wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
  });

  console.log('✅ WebSocket server initialized at /ws/measure');
  return wss;
}

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - WebSocket client
 * @param {http.IncomingMessage} req - HTTP request
 */
function handleConnection(ws, req) {
  console.log('📡 WebSocket client connected');

  let userId = null;
  let sessionId = generateSessionId();
  let measurementCount = 0;
  let sessionStartTime = Date.now();
  let measurements = [];
  let heartbeatTimer = null;

  // Send connection confirmation
  sendMessage(ws, {
    type: 'connection',
    message: 'Connected to NetVision measurement server',
    sessionId,
    timestamp: new Date().toISOString()
  });

  // Start heartbeat to keep connection alive
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      sendMessage(ws, {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    }
  }, CONSTANTS.WS.HEARTBEAT_INTERVAL_MS);

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Authenticate on first message
      if (!userId) {
        if (data.type === 'authenticate') {
          const result = await authenticateClient(data.token);
          if (result.success) {
            userId = result.userId;
            activeConnections.set(userId, ws);

            sendMessage(ws, {
              type: 'authenticated',
              message: 'Authentication successful',
              userId: userId
            });
          } else {
            sendMessage(ws, {
              type: 'error',
              message: result.error || 'Authentication failed'
            });
            ws.close(4001, 'Authentication failed');
          }
          return;
        } else {
          sendMessage(ws, {
            type: 'error',
            message: 'Please authenticate first by sending { type: "authenticate", token: "YOUR_JWT_TOKEN" }'
          });
          return;
        }
      }

      // Handle different message types
      switch (data.type) {
        case 'measurement':
          await handleMeasurement(ws, userId, data, sessionId, measurements);
          measurementCount++;
          break;

        case 'stop':
          await handleStop(ws, userId, data, sessionId, measurements, sessionStartTime);
          measurements = [];
          break;

        case 'ping':
          sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        default:
          sendMessage(ws, {
            type: 'error',
            message: `Unknown message type: ${data.type}`
          });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      sendMessage(ws, {
        type: 'error',
        message: 'Failed to process message: ' + error.message
      });
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`📡 WebSocket client disconnected (${userId})`);
    if (userId) {
      activeConnections.delete(userId);
    }
    clearInterval(heartbeatTimer);
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket client error:', error);
  });
}

/**
 * Authenticate WebSocket client with JWT token
 * @param {string} token - JWT token
 * @returns {object} Authentication result
 */
async function authenticateClient(token) {
  try {
    if (!token) {
      return {
        success: false,
        error: 'Token required'
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      userId: user._id.toString()
    };
  } catch (error) {
    console.error('Authentication error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle measurement data from client
 * @param {WebSocket} ws - WebSocket client
 * @param {string} userId - User ID
 * @param {object} data - Measurement data
 * @param {string} sessionId - Session ID
 * @param {array} measurements - Array to accumulate measurements
 */
async function handleMeasurement(ws, userId, data, sessionId, measurements) {
  const { rsrq, sinr, cqi, latitude, longitude, downloadSpeed, uploadSpeed, timestamp } = data;

  // Validate coordinates
  if (!isValidCoordinate(latitude, longitude)) {
    sendMessage(ws, {
      type: 'error',
      message: 'Invalid coordinates'
    });
    return;
  }

  // Validate radio metrics
  if (
    rsrq < -20 || rsrq > -3 ||
    sinr < -10 || sinr > 30 ||
    cqi < 0 || cqi > 15
  ) {
    sendMessage(ws, {
      type: 'error',
      message: 'Invalid radio metrics'
    });
    return;
  }

  // Calculate quality score
  const qualityScore = calculateQualityScore(rsrq, sinr, cqi);
  const humanMessage = generateHumanMessage(qualityScore, rsrq, sinr, cqi);

  // Store measurement
  measurements.push({
    rsrq,
    sinr,
    cqi,
    latitude,
    longitude,
    qualityScore,
    downloadSpeed: downloadSpeed || 0,
    uploadSpeed: uploadSpeed || 0,
    timestamp: timestamp || new Date()
  });

  // Find best nearby zone
  const bestZone = await findBestNearbyZone(userId, latitude, longitude);

  // Send response to client
  sendMessage(ws, {
    type: 'measurement_response',
    data: {
      qualityScore,
      humanMessage,
      bestZone: bestZone || { hasData: false },
      metrics: {
        rsrq,
        sinr,
        cqi,
        downloadSpeed: downloadSpeed || 0,
        uploadSpeed: uploadSpeed || 0
      },
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle stop measurement signal
 * Saves final measurement and returns summary
 * @param {WebSocket} ws - WebSocket client
 * @param {string} userId - User ID
 * @param {object} data - Stop data
 * @param {string} sessionId - Session ID
 * @param {array} measurements - Accumulated measurements
 * @param {number} sessionStartTime - Session start time
 */
async function handleStop(ws, userId, data, sessionId, measurements, sessionStartTime) {
  try {
    if (measurements.length === 0) {
      sendMessage(ws, {
        type: 'error',
        message: 'No measurements recorded'
      });
      return;
    }

    // Save all measurements to database
    const savedMeasurements = await ConnectivityData.insertMany(
      measurements.map(m => ({
        userId,
        location: {
          type: 'Point',
          coordinates: [m.longitude, m.latitude]
        },
        qualityScore: m.qualityScore,
        rsrq: m.rsrq,
        sinr: m.sinr,
        cqi: m.cqi,
        downloadSpeed: m.downloadSpeed,
        uploadSpeed: m.uploadSpeed,
        timestamp: m.timestamp
      }))
    );

    // Calculate session statistics
    const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000);
    const avgQuality = Math.round(
      measurements.reduce((sum, m) => sum + m.qualityScore, 0) / measurements.length
    );
    const avgRsrq = (measurements.reduce((sum, m) => sum + m.rsrq, 0) / measurements.length).toFixed(2);
    const avgSinr = (measurements.reduce((sum, m) => sum + m.sinr, 0) / measurements.length).toFixed(2);
    const avgCqi = (measurements.reduce((sum, m) => sum + m.cqi, 0) / measurements.length).toFixed(2);
    const avgDownloadSpeed = (measurements.reduce((sum, m) => sum + m.downloadSpeed, 0) / measurements.length).toFixed(2);
    const avgUploadSpeed = (measurements.reduce((sum, m) => sum + m.uploadSpeed, 0) / measurements.length).toFixed(2);

    const summary = {
      type: 'session_summary',
      sessionId,
      data: {
        measurementCount: measurements.length,
        sessionDuration: `${sessionDuration}s`,
        statistics: {
          averageQuality: avgQuality,
          averageRsrq: parseFloat(avgRsrq),
          averageSinr: parseFloat(avgSinr),
          averageCqi: parseFloat(avgCqi),
          averageDownloadSpeed: parseFloat(avgDownloadSpeed),
          averageUploadSpeed: parseFloat(avgUploadSpeed)
        },
        savedCount: savedMeasurements.length,
        timestamp: new Date().toISOString()
      }
    };

    sendMessage(ws, summary);
  } catch (error) {
    console.error('Stop measurement error:', error);
    sendMessage(ws, {
      type: 'error',
      message: 'Failed to save measurements: ' + error.message
    });
  }
}

/**
 * Find best nearby zone for given coordinates
 * @param {string} userId - User ID
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {object} Best zone data
 */
async function findBestNearbyZone(userId, latitude, longitude) {
  try {
    const nearbyData = await ConnectivityData.findOne({
      userId,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: CONSTANTS.GEO.DEFAULT_RADIUS_M
        }
      }
    }).sort({ qualityScore: -1 });

    if (!nearbyData) {
      return null;
    }

    const [spotLon, spotLat] = nearbyData.location.coordinates;
    const distance = calculateDistance(latitude, longitude, spotLat, spotLon);
    const bearing = calculateBearing(latitude, longitude, spotLat, spotLon);
    const direction = getCompassDirection(bearing);

    return {
      hasData: true,
      bearing,
      direction,
      distance: Math.round(distance),
      distanceFormatted: formatDistance(distance),
      qualityScore: nearbyData.qualityScore,
      recommendation: `Move ${direction} (${bearing}°) for better signal`
    };
  } catch (error) {
    console.error('Find best zone error:', error);
    return null;
  }
}

/**
 * Send message to WebSocket client safely
 * @param {WebSocket} ws - WebSocket client
 * @param {object} data - Message data
 */
function sendMessage(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Generate unique session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Broadcast message to all connected clients
 * @param {object} data - Message data
 */
function broadcastMessage(data) {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

module.exports = {
  initWebSocketServer,
  broadcastMessage,
  activeConnections
};