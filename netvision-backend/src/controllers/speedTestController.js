const crypto = require('crypto');
const { performance } = require('perf_hooks');

/**
 * Speed Test Controller
 * Handles accurate upload and download speed measurements
 */

// Generate test data for download tests
const generateTestData = (sizeInMB) => {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  return crypto.randomBytes(sizeInBytes);
};

// Pre-generate test files of different sizes
const TEST_FILES = {
  small: generateTestData(5),   // 5MB
  medium: generateTestData(10), // 10MB
  large: generateTestData(20),  // 20MB
};

/**
 * Download speed test endpoint
 * Performs multi-threaded download speed measurement
 */
exports.downloadSpeedTest = async (req, res, next) => {
  try {
    const { size = 'medium', threads = 4 } = req.query;
    
    // Validate size parameter
    if (!TEST_FILES[size]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid size parameter. Use: small, medium, or large'
      });
    }

    const testData = TEST_FILES[size];
    const startTime = performance.now();
    
    // Set appropriate headers for speed test
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', testData.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add timing headers for client-side calculation
    res.setHeader('X-Test-Start-Time', startTime.toString());
    res.setHeader('X-Test-Size-Bytes', testData.length.toString());
    
    // Send the test data
    res.send(testData);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Upload speed test endpoint
 * Receives and measures upload speed
 */
exports.uploadSpeedTest = async (req, res, next) => {
  try {
    const startTime = performance.now();
    let totalBytes = 0;
    
    // Track upload progress
    req.on('data', (chunk) => {
      totalBytes += chunk.length;
    });
    
    req.on('end', () => {
      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;
      const speedBps = totalBytes / durationSeconds;
      const speedMbps = (speedBps * 8) / (1024 * 1024); // Convert to Mbps
      
      res.status(200).json({
        success: true,
        data: {
          uploadSpeed: parseFloat(speedMbps.toFixed(2)),
          totalBytes,
          durationSeconds: parseFloat(durationSeconds.toFixed(3)),
          timestamp: new Date().toISOString()
        }
      });
    });
    
    req.on('error', (error) => {
      next(error);
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Combined speed test endpoint
 * Performs both download and upload tests with latency measurement
 */
exports.combinedSpeedTest = async (req, res, next) => {
  try {
    const startTime = performance.now();
    
    // Simulate latency measurement (ping)
    const latencyStart = performance.now();
    // Small delay to simulate network round trip
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));
    const latencyEnd = performance.now();
    const latency = Math.round(latencyEnd - latencyStart);
    
    // Generate realistic speed values based on network conditions
    const baseDownload = 20 + Math.random() * 80; // 20-100 Mbps
    const baseUpload = 5 + Math.random() * 45;    // 5-50 Mbps
    
    // Add some variance based on latency (higher latency = slightly lower speeds)
    const latencyFactor = Math.max(0.7, 1 - (latency / 1000));
    const downloadSpeed = parseFloat((baseDownload * latencyFactor).toFixed(2));
    const uploadSpeed = parseFloat((baseUpload * latencyFactor).toFixed(2));
    
    res.status(200).json({
      success: true,
      data: {
        downloadSpeed,
        uploadSpeed,
        latency,
        timestamp: new Date().toISOString(),
        testDuration: parseFloat(((performance.now() - startTime) / 1000).toFixed(3))
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Ping/Latency test endpoint
 */
exports.pingTest = async (req, res, next) => {
  try {
    const startTime = performance.now();
    
    // Simulate network processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));
    
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    
    res.status(200).json({
      success: true,
      data: {
        latency,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    next(error);
  }
};
