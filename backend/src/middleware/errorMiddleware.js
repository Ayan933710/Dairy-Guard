const logger = require('../utils/logger');
const env = require('../config/env');

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  logger.error(err.message, statusCode >= 500 ? err.stack : '');
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
