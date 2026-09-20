/** Centralized 404 + error-formatting middleware. Mounted last in app.js. */
const logger = require('../utils/logger');
const env = require('../config/env');

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Prefer an explicit statusCode thrown alongside the error (e.g. `Object.assign(new Error(...), { statusCode: 404 })`),
  // then fall back to whatever status code was already set on the response, then 500.
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  logger.error(err.message, statusCode >= 500 ? err.stack : '');
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
