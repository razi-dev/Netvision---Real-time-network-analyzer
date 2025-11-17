const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts, try again later' }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authLimiter, validate('register'), authController.register);

/**
 * POST /api/auth/login
 * Login user and get JWT token
 */
router.post('/login', authLimiter, validate('login'), authController.login);

/**
 * GET /api/auth/me
 * Get current user profile (protected)
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * PUT /api/auth/profile
 * Update user profile (protected)
 */
router.put('/profile', authenticateToken, authController.updateProfile);

/**
 * POST /api/auth/upload-profile-picture
 * Upload profile picture (protected)
 */
router.post('/upload-profile-picture', authenticateToken, authController.uploadProfilePicture);

/**
 * GET /api/auth/stats
 * Get user statistics (protected)
 */
router.get('/stats', authenticateToken, authController.getUserStats);

module.exports = router;