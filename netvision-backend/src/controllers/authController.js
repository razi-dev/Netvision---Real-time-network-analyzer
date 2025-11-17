const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with that email or username already exists'
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { profile } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        $set: { 
          profile: { ...profile }
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload profile picture
 */
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    // For now, we'll just store a placeholder URL
    // In production, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
    const profilePictureUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${req.user.userId}`;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        $set: { 
          'profile.profilePicture': profilePictureUrl
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    // Import models here to avoid circular dependencies
    const ConnectivityData = require('../models/ConnectivityData');
    const SavedSpot = require('../models/SavedSpot');
    
    // Get user for member since date
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get total measurements count
    const totalMeasurements = await ConnectivityData.countDocuments({ userId });
    
    // Get saved spots count
    const savedSpotsCount = await SavedSpot.countDocuments({ userId });
    
    // Get average quality score
    const avgQualityResult = await ConnectivityData.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, avgQuality: { $avg: '$qualityScore' } } }
    ]);
    const avgQualityScore = avgQualityResult.length > 0 ? Math.round(avgQualityResult[0].avgQuality) : 0;
    
    // Get last measurement date
    const lastMeasurement = await ConnectivityData.findOne({ userId }).sort({ timestamp: -1 });
    
    res.status(200).json({
      success: true,
      stats: {
        totalMeasurements,
        savedSpots: savedSpotsCount,
        avgQualityScore,
        lastMeasurement: lastMeasurement ? lastMeasurement.timestamp : null,
        memberSince: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};