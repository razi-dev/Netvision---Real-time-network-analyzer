/**
 * NetVision Backend Server
 * Main entry point for the Express application
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');
const { initWebSocketServer } = require('./src/websocket/measurementHandler');

// Import routes
const authRoutes = require('./src/routes/auth');
const connectivityRoutes = require('./src/routes/connectivity');
const towerRoutes = require('./src/routes/tower');
const speedTestRoutes = require('./src/routes/speedtest');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/connectivity', connectivityRoutes);
app.use('/api/towers', towerRoutes);
app.use('/api/speedtest', speedTestRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize WebSocket server
initWebSocketServer(server);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 NetVision server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`📡 WebSocket server available at ws://localhost:${PORT}/ws/measure`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server };