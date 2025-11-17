/**
 * Validation Middleware using Joi
 */

const Joi = require('joi');

// Validation schemas
const schemas = {
  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  measurement: Joi.object({
    rsrq: Joi.number().min(-20).max(-3).required(),
    sinr: Joi.number().min(-10).max(30).required(),
    cqi: Joi.number().integer().min(0).max(15).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    downloadSpeed: Joi.number().min(0).optional(),
    uploadSpeed: Joi.number().min(0).optional(),
    timestamp: Joi.date().optional(),
    saveOnStop: Joi.boolean().optional()
  }),

  bestZone: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(1).max(10000).optional()
  }),

  saveSpot: Joi.object({
    locationName: Joi.string().min(1).max(100).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    notes: Joi.string().max(500).optional(),
    qualityScore: Joi.number().min(0).max(100).optional()
  })
};

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of the schema to validate against
 * @returns {Function} Express middleware function
 */
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({
        success: false,
        message: `Validation schema '${schemaName}' not found`
      });
    }

    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorMessages
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

module.exports = { validate, schemas };