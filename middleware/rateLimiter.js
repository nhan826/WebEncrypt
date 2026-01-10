// Middleware for rate limiting
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'Too many login attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
});

// Encryption operation limiter (more generous)
const encryptionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 operations per minute
  message: {
    error: 'Rate limit exceeded. Please wait before performing more operations.'
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  encryptionLimiter
};
