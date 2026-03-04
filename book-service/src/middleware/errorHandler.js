'use strict';

const logger = require('../utils/logger');

/**
 * Central Express error handler.
 * Must be registered AFTER all routes with 4 arguments.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  logger.error({
    msg:    'Unhandled error',
    status,
    error:  err.message,
    stack:  process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    method: req.method,
    path:   req.path,
  });

  return res.status(status).json({ success: false, message });
}

module.exports = { errorHandler };
