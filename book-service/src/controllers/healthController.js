'use strict';

const db     = require('../config/database');
const config = require('../config/config');

const START_TIME = Date.now();

/**
 * GET /health
 * Basic liveness + service metadata.  Always 200 if the process is alive.
 */
function health(req, res) {
  return res.status(200).json({
    status:    'UP',
    service:   config.app.name,
    version:   config.app.version,
    env:       config.app.env,
    uptimeMs:  Date.now() - START_TIME,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /health/live
 * Kubernetes liveness probe.
 * Returns 200 if the Node process is alive and event loop is not frozen.
 * Never queries the database — kept intentionally cheap.
 */
function healthLive(req, res) {
  return res.status(200).json({
    status:    'UP',
    service:   config.app.name,
    uptimeMs:  Date.now() - START_TIME,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /health/ready
 * Kubernetes readiness probe.
 * Returns 200 only when the service can handle traffic:
 *   – PostgreSQL is reachable AND
 *   – books table exists (migration has run)
 */
async function healthReady(req, res) {
  const checks = { database: false };

  try {
    await db.checkConnection();
    checks.database = true;
  } catch (err) {
    // fall through — checks.database stays false
  }

  const ready  = Object.values(checks).every(Boolean);
  const status = ready ? 200 : 503;

  return res.status(status).json({
    status:    ready ? 'UP' : 'DOWN',
    service:   config.app.name,
    checks,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { health, healthLive, healthReady };
