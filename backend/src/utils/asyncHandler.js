/**
 * Wraps an async Express route handler so rejected promises are
 * forwarded to next(err) instead of crashing the process / hanging
 * the request. Avoids try/catch boilerplate in every controller.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
