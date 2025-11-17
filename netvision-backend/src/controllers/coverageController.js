const ConnectivityData = require('../models/ConnectivityData');

/**
 * Get coverage data for heatmap visualization
 * Combines user measurement data with base coverage data
 */
exports.getCoverageData = async (req, res, next) => {
  try {
    const { 
      provider, 
      dataSource = 'hybrid', // 'user', 'base', 'hybrid'
      bounds, // Optional: map bounds for filtering
      limit = 1000 
    } = req.query;

    console.log('Coverage request:', { provider, dataSource, bounds, limit });

    let coverageData = [];

    // Fetch user measurement data
    if (dataSource === 'user' || dataSource === 'hybrid') {
      const query = {};
      
      // Filter by provider if specified
      if (provider && provider !== 'all') {
        query.provider = provider;
      }

      // Filter by geographic bounds if provided
      if (bounds) {
        const [minLng, minLat, maxLng, maxLat] = bounds.split(',').map(Number);
        query.location = {
          $geoWithin: {
            $geometry: {
              type: 'Polygon',
              coordinates: [[
                [minLng, minLat],
                [maxLng, minLat],
                [maxLng, maxLat],
                [minLng, maxLat],
                [minLng, minLat]
              ]]
            }
          }
        };
      }

      const userMeasurements = await ConnectivityData
        .find(query)
        .select('location qualityScore provider timestamp')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .lean();

      console.log('User measurements found:', userMeasurements.length);

      // Transform user data to coverage format
      const userData = userMeasurements.map(measurement => ({
        lat: measurement.location.coordinates[1],
        lng: measurement.location.coordinates[0],
        qualityScore: measurement.qualityScore,
        provider: measurement.provider,
        source: 'user',
        timestamp: measurement.timestamp
      }));

      coverageData = [...coverageData, ...userData];
    }

    // Add base coverage data (mock data for now)
    if (dataSource === 'base' || dataSource === 'hybrid') {
      const baseData = generateBaseCoverageData(provider, bounds);
      console.log('Base coverage data generated:', baseData.length);
      coverageData = [...coverageData, ...baseData];
    }

    // Sort by quality score for better visualization
    coverageData.sort((a, b) => b.qualityScore - a.qualityScore);

    console.log('Total coverage data points:', coverageData.length);

    res.status(200).json({
      success: true,
      data: coverageData,
      meta: {
        total: coverageData.length,
        dataSource,
        provider: provider || 'all',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching coverage data:', error);
    // Return error details for debugging
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coverage data: ' + (error.message || 'Unknown error'),
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
      data: []
    });
  }
};

/**
 * Generate base coverage data (mock OpenCelliD-style data)
 * Generates realistic coverage heatmap data around user's location
 */
function generateBaseCoverageData(provider, bounds) {
  const baseData = [];
  const providers = ['Airtel', 'Jio', 'Vi', 'BSNL'];
  
  // Default bounds (India region) if not provided
  let minLat = 8.0, maxLat = 37.0, minLng = 68.0, maxLng = 97.0;
  let centerLat = 28.6139, centerLng = 77.2090; // Default to Delhi
  
  if (bounds) {
    const [bMinLng, bMinLat, bMaxLng, bMaxLat] = bounds.split(',').map(Number);
    minLat = bMinLat;
    maxLat = bMaxLat;
    minLng = bMinLng;
    maxLng = bMaxLng;
    
    // Calculate center of bounds for better distribution
    centerLat = (bMinLat + bMaxLat) / 2;
    centerLng = (bMinLng + bMaxLng) / 2;
  }

  // Generate base coverage points with better distribution
  const numPoints = 300; // Increased coverage points for better heatmap
  
  for (let i = 0; i < numPoints; i++) {
    let lat, lng;
    
    // Use Gaussian distribution around center for more realistic clustering
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * Math.random() * (maxLat - minLat) * 0.5; // Clustered distribution
    
    lat = centerLat + distance * Math.cos(angle);
    lng = centerLng + distance * Math.sin(angle);
    
    // Ensure within bounds
    lat = Math.max(minLat, Math.min(maxLat, lat));
    lng = Math.max(minLng, Math.min(maxLng, lng));
    
    const selectedProvider = providers[Math.floor(Math.random() * providers.length)];
    
    // Skip if provider filter doesn't match
    if (provider && provider !== 'all' && provider !== selectedProvider) {
      continue;
    }

    // Generate realistic quality scores with better variation
    // Closer to center = better coverage
    const distFromCenter = Math.sqrt(
      Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2)
    );
    const maxDist = Math.max(maxLat - minLat, maxLng - minLng);
    const distanceFactor = Math.max(0.3, 1 - (distFromCenter / maxDist));
    
    // Urban areas tend to have better coverage
    const urbanFactor = Math.random() > 0.6 ? 1.15 : 1.0; // 40% chance of urban boost
    let baseQuality = 35 + Math.random() * 50; // Base range 35-85
    baseQuality *= distanceFactor * urbanFactor;
    baseQuality = Math.min(95, Math.max(15, baseQuality)); // Clamp between 15-95

    baseData.push({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      qualityScore: Math.round(baseQuality),
      provider: selectedProvider,
      source: 'base',
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 30) // Random time in last 30 days
    });
  }

  return baseData;
}

/**
 * Get coverage statistics
 */
exports.getCoverageStats = async (req, res, next) => {
  try {
    const { provider } = req.query;
    
    const matchStage = {};
    if (provider && provider !== 'all') {
      matchStage.provider = provider;
    }

    const stats = await ConnectivityData.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$provider',
          avgQuality: { $avg: '$qualityScore' },
          minQuality: { $min: '$qualityScore' },
          maxQuality: { $max: '$qualityScore' },
          totalMeasurements: { $sum: 1 },
          avgDownloadSpeed: { $avg: '$downloadSpeed' },
          avgUploadSpeed: { $avg: '$uploadSpeed' }
        }
      },
      { $sort: { avgQuality: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching coverage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coverage statistics'
    });
  }
};
