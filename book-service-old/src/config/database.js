'use strict';

const { Pool } = require('pg');
const config   = require('./config');
const logger   = require('../utils/logger');

// Singleton pool — shared across all modules
let pool = null;

/**
 * Return (or create) the singleton connection pool.
 * Accepts an optional override for test isolation.
 */
function getPool(overrideConfig) {
  if (overrideConfig) {
    return new Pool(overrideConfig);
  }
  if (!pool) {
    pool = new Pool({
      host:     config.db.host,
      port:     config.db.port,
      database: config.db.database,
      user:     config.db.user,
      password: config.db.password,
      ssl:      config.db.ssl,
      ...config.db.pool,
    });

    pool.on('error', (err) => {
      logger.error({ msg: 'Unexpected PostgreSQL pool error', err: err.message });
    });

    logger.info({ msg: 'PostgreSQL pool created', host: config.db.host, db: config.db.database });
  }
  return pool;
}

/**
 * Verify the pool can connect and execute a lightweight query.
 * Used by /health/ready.
 * @returns {Promise<boolean>}
 */
async function checkConnection() {
  const client = await getPool().connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

/**
 * Execute a query using the shared pool.
 */
async function query(text, params) {
  const start  = Date.now();
  const result = await getPool().query(text, params);
  const ms     = Date.now() - start;
  logger.debug({ msg: 'db.query', rows: result.rowCount, ms });
  return result;
}

/**
 * Gracefully drain and end the pool (used in tests and on shutdown).
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info({ msg: 'PostgreSQL pool closed' });
  }
}

module.exports = { getPool, checkConnection, query, close };
