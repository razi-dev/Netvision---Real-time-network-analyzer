const { calculateDistance } = require('../utils/geoUtils');
const towerService = require('../services/towerService');

/**
 * Get nearby cell towers based on MCC, MNC, LAC, CID
 */
exports.getTowers = async (req, res, next) => {
  try {
    const { mcc, mnc, lac, cid, latitude, longitude, radius = 5, limit = 50 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
        data: []
      });
    }
    
    console.log(`TowersController: Fetching towers for lat=${latitude}, lon=${longitude}, radius=${radius}, limit=${limit}`);
    
    // Get real tower data using the tower service
    const towers = await towerService.getRealTowers(
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseInt(radius), 
      parseInt(limit)
    );
    
    console.log(`TowersController: Received ${towers.length} towers from service`);
    
    // If still no towers, create some basic fallback towers
    if (towers.length === 0) {
      console.log('No towers found, creating fallback towers...');
      const fallbackTowers = [
        {
          id: 'fallback-1',
          lat: parseFloat(latitude) + 0.001,
          lon: parseFloat(longitude) + 0.001,
          operator: 'Jio',
          qualityScore: 85,
          distance: 100,
          type: 'primary',
          towerType: '4G',
          frequency: '2300 MHz',
          signalStrength: -65,
          coverage: 'good',
          lastUpdated: new Date().toISOString(),
          cellId: 12345,
          lac: 1001,
          mcc: '404',
          mnc: '11',
          isReal: false
        },
        {
          id: 'fallback-2',
          lat: parseFloat(latitude) - 0.001,
          lon: parseFloat(longitude) - 0.001,
          operator: 'Airtel',
          qualityScore: 78,
          distance: 150,
          type: 'primary',
          towerType: '4G',
          frequency: '1800 MHz',
          signalStrength: -70,
          coverage: 'good',
          lastUpdated: new Date().toISOString(),
          cellId: 12346,
          lac: 1001,
          mcc: '404',
          mnc: '10',
          isReal: false
        }
      ];
      
      res.status(200).json({
        success: true,
        data: fallbackTowers,
        meta: {
          total: fallbackTowers.length,
          radius: `${radius}km`,
          center: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
          dataSource: 'Fallback',
          cached: false
        }
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: towers,
      meta: {
        total: towers.length,
        radius: `${radius}km`,
        center: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        dataSource: towers.length > 0 && towers[0].isReal ? 'OpenCellID' : 'Static Database',
        cached: true // Data is cached for consistency
      }
    });
  } catch (error) {
    console.error('Error fetching towers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tower data',
      data: []
    });
  }
};

/**
 * Generate mock towers for demo purposes
 */
function generateMockTowers(userLat, userLon, radiusKm = 5, limit = 50) {
  if (!userLat || !userLon) {
    userLat = 28.6139; // Delhi default
    userLon = 77.2090;
  }
  
  const towers = [];
  const operators = ['Jio', 'Airtel', 'Vi', 'BSNL', 'Idea', 'Vodafone'];
  const towerTypes = ['4G', '5G', '3G', 'LTE'];
  const frequencyBands = ['850 MHz', '900 MHz', '1800 MHz', '2100 MHz', '2300 MHz', '2500 MHz'];
  
  // Convert radius from km to degrees (approximate)
  const radiusDegrees = radiusKm / 111; // 1 degree ≈ 111 km
  
  // Generate towers in a realistic distribution
  for (let i = 0; i < limit; i++) {
    // Generate random position within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusDegrees;
    
    const lat = parseFloat(userLat) + distance * Math.cos(angle);
    const lon = parseFloat(userLon) + distance * Math.sin(angle);
    
    // Calculate actual distance in meters
    const actualDistance = calculateDistance(userLat, userLon, lat, lon) * 1000;
    
    // Generate realistic quality score based on distance
    let baseQuality = Math.max(30, 100 - (actualDistance / 50)); // Closer towers have better quality
    baseQuality += (Math.random() - 0.5) * 40; // Add more randomness for variety
    const qualityScore = Math.max(15, Math.min(100, Math.round(baseQuality)));
    
    // Select operator with realistic distribution
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const towerType = towerTypes[Math.floor(Math.random() * towerTypes.length)];
    const frequency = frequencyBands[Math.floor(Math.random() * frequencyBands.length)];
    
    towers.push({
      id: `tower-${i + 1}`,
      lat: parseFloat(lat.toFixed(6)),
      lon: parseFloat(lon.toFixed(6)),
      operator,
      qualityScore,
      distance: Math.round(actualDistance),
      type: qualityScore > 70 ? 'primary' : 'secondary',
      towerType,
      frequency,
      // Additional realistic data
      signalStrength: Math.round(-40 - (actualDistance / 50)), // dBm
      coverage: qualityScore > 80 ? 'excellent' : qualityScore > 60 ? 'good' : qualityScore > 40 ? 'fair' : 'poor',
      lastUpdated: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24h
      // Simulate cell tower identifiers
      cellId: Math.floor(Math.random() * 65535),
      lac: Math.floor(Math.random() * 65535),
      mcc: '404', // India
      mnc: operator === 'Jio' ? '11' : operator === 'Airtel' ? '10' : operator === 'Vi' ? '20' : '15'
    });
  }
  
  // Sort by distance (closest first)
  towers.sort((a, b) => a.distance - b.distance);
  
  return towers;
}

/**
 * Get towers by location/district name
 */
exports.getTowersByLocation = async (req, res, next) => {
  try {
    const { locationName } = req.params;
    const { limit = 100 } = req.query;
    
    // Get coordinates for the location
    const locationCoords = getLocationCoordinates(locationName);
    
    if (!locationCoords) {
      return res.status(404).json({
        success: false,
        message: `Location '${locationName}' not found`,
        data: []
      });
    }
    
    // Get real tower data for the location
    const towers = await towerService.getRealTowers(
      locationCoords.latitude, 
      locationCoords.longitude, 
      locationCoords.radius || 10, // Default 10km radius for district
      parseInt(limit)
    );
    
    res.status(200).json({
      success: true,
      data: towers,
      meta: {
        location: locationName,
        coordinates: locationCoords,
        total: towers.length,
        radius: `${locationCoords.radius || 10}km`,
        dataSource: towers.length > 0 && towers[0].isReal ? 'OpenCellID' : 'Static Database',
        cached: true
      }
    });
  } catch (error) {
    console.error('Error fetching towers by location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tower data for location',
      data: []
    });
  }
};

/**
 * Get coordinates for known locations/districts
 */
function getLocationCoordinates(locationName) {
  const locations = {
    // Major Indian cities and districts
    'delhi': { latitude: 28.6139, longitude: 77.2090, radius: 15 },
    'mumbai': { latitude: 19.0760, longitude: 72.8777, radius: 20 },
    'bangalore': { latitude: 12.9716, longitude: 77.5946, radius: 15 },
    'chennai': { latitude: 13.0827, longitude: 80.2707, radius: 15 },
    'hyderabad': { latitude: 17.3850, longitude: 78.4867, radius: 15 },
    'pune': { latitude: 18.5204, longitude: 73.8567, radius: 12 },
    'kolkata': { latitude: 22.5726, longitude: 88.3639, radius: 15 },
    'ahmedabad': { latitude: 23.0225, longitude: 72.5714, radius: 12 },
    'jaipur': { latitude: 26.9124, longitude: 75.7873, radius: 10 },
    'lucknow': { latitude: 26.8467, longitude: 80.9462, radius: 10 },
    'kanpur': { latitude: 26.4499, longitude: 80.3319, radius: 8 },
    'nagpur': { latitude: 21.1458, longitude: 79.0882, radius: 8 },
    'indore': { latitude: 22.7196, longitude: 75.8577, radius: 8 },
    'thane': { latitude: 19.2183, longitude: 72.9781, radius: 6 },
    'bhopal': { latitude: 23.2599, longitude: 77.4126, radius: 8 },
    'visakhapatnam': { latitude: 17.6868, longitude: 83.2185, radius: 8 },
    'pimpri': { latitude: 18.6298, longitude: 73.7997, radius: 5 },
    'patna': { latitude: 25.5941, longitude: 85.1376, radius: 8 },
    'vadodara': { latitude: 22.3072, longitude: 73.1812, radius: 8 },
    'ludhiana': { latitude: 30.9010, longitude: 75.8573, radius: 6 },
    'agra': { latitude: 27.1767, longitude: 78.0081, radius: 6 },
    'nashik': { latitude: 19.9975, longitude: 73.7898, radius: 6 },
    'faridabad': { latitude: 28.4089, longitude: 77.3178, radius: 5 },
    'meerut': { latitude: 28.9845, longitude: 77.7064, radius: 5 },
    'rajkot': { latitude: 22.3039, longitude: 70.8022, radius: 6 },
    'kalyan': { latitude: 19.2437, longitude: 73.1355, radius: 4 },
    'vasai': { latitude: 19.4911, longitude: 72.8054, radius: 4 },
    'varanasi': { latitude: 25.3176, longitude: 82.9739, radius: 6 },
    'srinagar': { latitude: 34.0837, longitude: 74.7973, radius: 8 },
    'aurangabad': { latitude: 19.8762, longitude: 75.3433, radius: 6 },
    'dhanbad': { latitude: 23.7957, longitude: 86.4304, radius: 5 },
    'amritsar': { latitude: 31.6340, longitude: 74.8723, radius: 5 },
    'navi mumbai': { latitude: 19.0330, longitude: 73.0297, radius: 8 },
    'allahabad': { latitude: 25.4358, longitude: 81.8463, radius: 6 },
    'ranchi': { latitude: 23.3441, longitude: 85.3096, radius: 6 },
    'howrah': { latitude: 22.5958, longitude: 88.2636, radius: 4 },
    'coimbatore': { latitude: 11.0168, longitude: 76.9558, radius: 6 },
    'jabalpur': { latitude: 23.1815, longitude: 79.9864, radius: 5 },
    'gwalior': { latitude: 26.2183, longitude: 78.1828, radius: 5 },
    'vijayawada': { latitude: 16.5062, longitude: 80.6480, radius: 5 },
    'jodhpur': { latitude: 26.2389, longitude: 73.0243, radius: 6 },
    'madurai': { latitude: 9.9252, longitude: 78.1198, radius: 5 },
    'raipur': { latitude: 21.2514, longitude: 81.6296, radius: 5 },
    'kota': { latitude: 25.2138, longitude: 75.8648, radius: 4 },
    'guwahati': { latitude: 26.1445, longitude: 91.7362, radius: 6 },
    'chandigarh': { latitude: 30.7333, longitude: 76.7794, radius: 4 },
    'solapur': { latitude: 17.6599, longitude: 75.9064, radius: 4 },
    'hubli': { latitude: 15.3647, longitude: 75.1240, radius: 4 },
    'tiruchirappalli': { latitude: 10.7905, longitude: 78.7047, radius: 4 },
    'bareilly': { latitude: 28.3670, longitude: 79.4304, radius: 4 },
    'mysore': { latitude: 12.2958, longitude: 76.6394, radius: 4 },
    'tiruppur': { latitude: 11.1085, longitude: 77.3411, radius: 3 },
    'gurgaon': { latitude: 28.4595, longitude: 77.0266, radius: 6 },
    'aligarh': { latitude: 27.8974, longitude: 78.0880, radius: 4 },
    'jalandhar': { latitude: 31.3260, longitude: 75.5762, radius: 4 },
    'bhubaneswar': { latitude: 20.2961, longitude: 85.8245, radius: 5 },
    'salem': { latitude: 11.6643, longitude: 78.1460, radius: 4 },
    'warangal': { latitude: 17.9689, longitude: 79.5941, radius: 4 },
    'mira': { latitude: 19.2952, longitude: 72.8544, radius: 3 },
    'thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366, radius: 5 },
    'bhiwandi': { latitude: 19.3002, longitude: 73.0635, radius: 3 },
    'saharanpur': { latitude: 29.9680, longitude: 77.5552, radius: 3 },
    'guntur': { latitude: 16.3067, longitude: 80.4365, radius: 4 },
    'amravati': { latitude: 20.9374, longitude: 77.7796, radius: 3 },
    'bikaner': { latitude: 28.0229, longitude: 73.3119, radius: 4 },
    'noida': { latitude: 28.5355, longitude: 77.3910, radius: 5 },
    'jamshedpur': { latitude: 22.8046, longitude: 86.2029, radius: 4 },
    'bhilai nagar': { latitude: 21.1938, longitude: 81.3509, radius: 3 },
    'cuttack': { latitude: 20.4625, longitude: 85.8828, radius: 3 },
    'firozabad': { latitude: 27.1592, longitude: 78.3957, radius: 3 },
    'kochi': { latitude: 9.9312, longitude: 76.2673, radius: 4 },
    'bhavnagar': { latitude: 21.7645, longitude: 72.1519, radius: 3 },
    'dehradun': { latitude: 30.3165, longitude: 78.0322, radius: 4 },
    'durgapur': { latitude: 23.5204, longitude: 87.3119, radius: 3 },
    'asansol': { latitude: 23.6739, longitude: 86.9524, radius: 3 },
    'nanded': { latitude: 19.1383, longitude: 77.2975, radius: 3 },
    'kolhapur': { latitude: 16.7050, longitude: 74.2433, radius: 3 },
    'ajmer': { latitude: 26.4499, longitude: 74.6399, radius: 3 },
    'akola': { latitude: 20.7002, longitude: 77.0082, radius: 3 },
    'gulbarga': { latitude: 17.3297, longitude: 76.8343, radius: 3 },
    'jamnagar': { latitude: 22.4707, longitude: 70.0577, radius: 3 },
    'ujjain': { latitude: 23.1765, longitude: 75.7885, radius: 3 },
    'loni': { latitude: 28.7333, longitude: 77.2833, radius: 2 },
    'siliguri': { latitude: 26.7271, longitude: 88.3953, radius: 3 },
    'jhansi': { latitude: 25.4484, longitude: 78.5685, radius: 3 },
    'ulhasnagar': { latitude: 19.2215, longitude: 73.1645, radius: 2 },
    'jammu': { latitude: 32.7266, longitude: 74.8570, radius: 4 },
    'sangli': { latitude: 16.8524, longitude: 74.5815, radius: 2 },
    'mangalore': { latitude: 12.9141, longitude: 74.8560, radius: 3 },
    'erode': { latitude: 11.3410, longitude: 77.7172, radius: 2 },
    'belgaum': { latitude: 15.8497, longitude: 74.4977, radius: 3 },
    'ambattur': { latitude: 13.1143, longitude: 80.1548, radius: 2 },
    'tirunelveli': { latitude: 8.7139, longitude: 77.7567, radius: 3 },
    'malegaon': { latitude: 20.5579, longitude: 74.5287, radius: 2 },
    'gaya': { latitude: 24.7914, longitude: 85.0002, radius: 2 }
  };
  
  const location = locationName.toLowerCase().trim();
  return locations[location] || null;
}
