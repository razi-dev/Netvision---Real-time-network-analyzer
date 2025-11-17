# Tower Data Setup Guide

## Overview
NetVision now supports **real cell tower locations** instead of random mock data. Tower locations are consistent and cached, so they won't change between app sessions.

## Current Implementation

### 1. **Static Tower Database** (Default)
- **Fixed tower locations** for major Indian cities
- **Consistent positions** that never change
- **No API key required**
- **Immediate availability**

### 2. **OpenCellID Integration** (Optional)
- **Real-world tower data** from OpenCellID database
- **Accurate locations** based on actual cell tower positions
- **Requires free API key**
- **Fallback to static data if API fails**

## How to Enable Real Tower Data

### Step 1: Get OpenCellID API Key (Free)
1. Visit [OpenCellID.org](https://opencellid.org/)
2. Create a free account
3. Generate your API key
4. Copy the API key

### Step 2: Configure Backend
1. Navigate to `netvision-backend/`
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` file and add your API key:
   ```env
   OPENCELLID_API_KEY=your_actual_api_key_here
   ```

### Step 3: Restart Backend
```bash
cd netvision-backend
npm start
```

## Data Sources Explained

### Without API Key (Static Database)
- **Fixed tower locations** for consistency
- **Approximate real positions** in major cities
- **No external API calls**
- **Always available**

### With API Key (OpenCellID)
- **Real tower data** from global database
- **Accurate positions** from actual measurements
- **24-hour caching** for performance
- **Automatic fallback** to static data

## Benefits of Real Tower Data

### ✅ **Consistent Locations**
- Tower positions **never change** between app sessions
- **Cached for 24 hours** to ensure consistency
- **No more random positions** on each app load

### ✅ **Accurate Information**
- **Real operator names** (Jio, Airtel, Vi, BSNL)
- **Actual tower types** (2G, 3G, 4G, 5G)
- **Correct frequency bands**
- **Real signal strength data**

### ✅ **Performance Optimized**
- **Intelligent caching** reduces API calls
- **Fast response times** with local fallback
- **Automatic error handling**

## Troubleshooting

### Tower Locations Still Changing?
1. **Check API key** in `.env` file
2. **Restart backend** after adding API key
3. **Clear app cache** and reload
4. **Check backend logs** for API errors

### No Towers Showing?
1. **Verify location permissions** are granted
2. **Check network connectivity**
3. **Ensure backend is running** on correct port
4. **Check browser console** for errors

### API Key Not Working?
1. **Verify API key** is correct in `.env`
2. **Check OpenCellID account** is active
3. **Test API key** manually with curl:
   ```bash
   curl "https://opencellid.org/cell/get?key=YOUR_API_KEY&lat=28.6139&lon=77.2090&radius=5000&limit=10&format=json"
   ```

## Technical Details

### Caching Strategy
- **24-hour cache** for tower data
- **Location-based keys** for efficient lookup
- **Automatic cache invalidation**
- **Memory-efficient storage**

### Fallback Mechanism
1. **Try OpenCellID API** (if key available)
2. **Use static database** (if API fails)
3. **Return empty array** (if all fails)

### Data Transformation
- **Consistent format** across all sources
- **Quality score calculation** based on distance/signal
- **Operator name mapping** for Indian networks
- **Tower type detection** from radio technology

## Static Tower Coverage

Current static database includes towers for:
- **Delhi** - 4 towers
- **Mumbai** - 3 towers  
- **Bangalore** - 3 towers
- **Chennai** - 2 towers
- **Hyderabad** - 2 towers

*More cities can be added to the static database as needed.*

## API Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "tower-12345",
      "lat": 28.6139,
      "lon": 77.2090,
      "operator": "Jio",
      "qualityScore": 85,
      "distance": 1200,
      "type": "primary",
      "towerType": "5G",
      "frequency": "2300 MHz",
      "signalStrength": -65,
      "coverage": "excellent",
      "cellId": 12345,
      "lac": 1001,
      "mcc": "404",
      "mnc": "11",
      "isReal": true
    }
  ],
  "meta": {
    "total": 15,
    "radius": "5km",
    "dataSource": "OpenCellID",
    "cached": true
  }
}
```

## Support

For issues with tower data:
1. Check this guide first
2. Verify backend logs
3. Test with static data (no API key)
4. Contact support with specific error messages
