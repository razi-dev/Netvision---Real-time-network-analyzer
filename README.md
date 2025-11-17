# NetVision - Network Coverage & Tower Visualization App

NetVision is a mobile application that provides real-time network coverage visualization and cellular tower mapping across India. It helps users understand signal quality, network availability, and tower locations in their area.

## 📱 Features

- **Live Tower Mapping**: View cellular towers around your current location
- **Coverage Heatmap**: Visualize network signal strength with color-coded heatmap
- **Multi-Provider Support**: Coverage data for Jio, Airtel, Vi, BSNL, and other operators
- **Real-time Location Tracking**: Dynamic updates as you move across different locations
- **Signal Quality Analysis**: Detailed metrics including signal strength, coverage levels, and quality scores
- **Multiple Data Sources**: Hybrid view combining user measurements and base coverage data
- **Interactive Map**: Zoom, pan, and explore network coverage in detail

## 🏗️ Project Structure

```
Netvision-app/
├── netvision-frontend/          # React Native Expo app
│   ├── app/                     # App screens and navigation
│   │   ├── (tabs)/             # Tab-based navigation
│   │   │   ├── index.tsx       # Main map screen
│   │   │   ├── heatmap.tsx     # Heatmap visualization
│   │   │   └── ...
│   │   └── _layout.tsx         # Root layout
│   ├── components/              # Reusable components
│   │   ├── coverage/           # Coverage/heatmap components
│   │   └── ...
│   ├── services/                # API services
│   │   ├── connectivity.service.ts
│   │   ├── coverage.service.ts
│   │   └── api.service.ts
│   ├── hooks/                   # Custom React hooks
│   └── package.json
│
└── netvision-backend/           # Node.js/Express backend
    ├── src/
    │   ├── controllers/         # Route controllers
    │   ├── services/            # Business logic
    │   │   └── towerService.js # Tower data generation
    │   ├── routes/              # API routes
    │   ├── models/              # MongoDB models
    │   ├── middleware/          # Express middleware
    │   └── Utils/               # Utility functions
    ├── server.js                # Main server entry
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (for backend data storage)
- **Expo CLI** (for frontend development)
- **Git**

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Netvision-app
```

#### 2. Backend Setup

```bash
cd netvision-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env with your settings:
# - MONGODB_URI=mongodb://localhost:27017/netvision
# - PORT=5000
# - JWT_SECRET=your_secret_key
# - OPENCELLID_API_KEY=your_api_key (optional)

# Start the backend server
npm start
```

The backend will run on `http://localhost:5000`

#### 3. Frontend Setup

```bash
cd netvision-frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env with your settings:
# - EXPO_PUBLIC_API_URL=http://localhost:5000/api

# Start the Expo development server
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## 📋 Environment Variables

### Backend (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/netvision

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# OpenCellID API (Optional - for real tower data)
OPENCELLID_API_KEY=your_opencellid_api_key

# CORS
CORS_ORIGIN=http://localhost:8081
```

### Frontend (.env)

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_WS_URL=ws://localhost:5000/ws
```

## 🔧 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd netvision-backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd netvision-frontend
npx expo start
```

### Production Build

**Backend:**
```bash
cd netvision-backend
npm run build
npm start
```

**Frontend (APK for Android):**
```bash
cd netvision-frontend
eas build --platform android
```

**Frontend (IPA for iOS):**
```bash
cd netvision-frontend
eas build --platform ios
```

## 📡 API Endpoints

### Towers
- `GET /api/connectivity/towers` - Get towers near coordinates
- `GET /api/connectivity/towers/location/:locationName` - Get towers by location name

### Coverage
- `GET /api/connectivity/coverage` - Get coverage heatmap data
- `GET /api/connectivity/coverage/stats` - Get coverage statistics

### Measurements
- `POST /api/connectivity/measure` - Record network measurement
- `GET /api/connectivity/measurements` - Get user measurements

## 🗺️ How to Use

### Main Map Screen
1. **Open the app** - Your location is marked with a blue dot
2. **View towers** - Red/green markers show nearby cellular towers
3. **Tap a tower** - See detailed information (operator, frequency, signal strength)
4. **Zoom in/out** - Use pinch gesture to zoom
5. **Pan** - Drag to explore different areas

### Heatmap Screen
1. **Tap Heatmap tab** - Switch to heatmap view
2. **View coverage** - Color gradient shows signal quality:
   - 🟢 **Green** (70-100): Strong coverage
   - 🟡 **Yellow** (40-69): Medium coverage
   - 🔴 **Red** (0-39): Poor coverage
3. **Select provider** - Filter by Jio, Airtel, Vi, BSNL
4. **Change data source** - Toggle between User Data, Base Data, or Hybrid

## 🔄 How It Works

### Tower System
1. App sends your GPS coordinates to backend
2. Backend generates 50 towers within 5km radius
3. Towers are positioned realistically around your location
4. Each tower has operator, frequency, and signal strength data
5. When you move, new towers are generated for your new location

### Heatmap System
1. App sends your location bounds to backend
2. Backend generates 300 coverage points around your area
3. Points cluster realistically using Gaussian distribution
4. Quality scores based on distance from center
5. Heatmap updates as you move to different locations

## 🛠️ Technology Stack

### Frontend
- **React Native** with Expo
- **TypeScript** for type safety
- **React Native Maps** for map visualization
- **TailwindCSS** for styling
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **MongoDB** for data storage
- **JWT** for authentication
- **WebSocket** for real-time updates
- **Mongoose** for database modeling

## 📊 Data Sources

- **Dynamic Generation**: Realistic tower positions generated based on user location
- **OpenCellID API**: Real tower data (optional, requires API key)
- **User Measurements**: Crowdsourced network quality data
- **Base Coverage Data**: Generated coverage patterns for visualization

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill the process using port 5000
kill -9 <PID>

# Restart backend
npm start
```

### Frontend can't connect to backend
- Verify backend is running on `http://localhost:5000`
- Check `.env` file has correct `EXPO_PUBLIC_API_URL`
- Ensure both are on same network (for physical device testing)

### Heatmap not loading
- Check browser console for errors
- Verify backend `/api/connectivity/coverage` endpoint is accessible
- Restart backend server
- Clear app cache and reload

### Towers not showing
- Ensure location permissions are granted
- Check that you're not in a location with no coverage data
- Verify backend is generating towers correctly

## 📝 API Response Examples

### Get Towers Response
```json
{
  "success": true,
  "data": [
    {
      "id": "tower-1",
      "lat": 10.9,
      "lon": 75.8,
      "operator": "Jio",
      "qualityScore": 85,
      "distance": 450,
      "type": "primary",
      "towerType": "5G",
      "frequency": "2300 MHz",
      "signalStrength": -65,
      "coverage": "excellent"
    }
  ]
}
```

### Get Coverage Response
```json
{
  "success": true,
  "data": [
    {
      "lat": 10.9,
      "lng": 75.8,
      "qualityScore": 75,
      "provider": "Jio",
      "source": "base",
      "timestamp": "2025-11-17T12:00:00Z"
    }
  ],
  "meta": {
    "total": 300,
    "dataSource": "hybrid",
    "provider": "all",
    "timestamp": "2025-11-17T12:00:00Z"
  }
}
```

## 🔐 Security

- JWT-based authentication for protected endpoints
- Environment variables for sensitive data
- CORS configuration for API access control
- Input validation on all endpoints
- Rate limiting on measurement endpoints

## 📈 Performance

- Optimized map rendering with marker clustering
- Heatmap data caching for faster loads
- Pagination for large datasets
- WebSocket for real-time updates
- Lazy loading of components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: support@netvision.app
- Documentation: [Full Docs](./docs)

## 🎯 Roadmap

- [ ] Real OpenCellID API integration
- [ ] User measurement crowdsourcing
- [ ] Network speed testing
- [ ] Historical coverage trends
- [ ] Offline map support
- [ ] Export coverage reports
- [ ] Multi-language support
- [ ] Dark mode theme

## 🙏 Acknowledgments

- OpenCellID for tower data API
- React Native and Expo communities
- All contributors and testers

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Status**: Active Development
