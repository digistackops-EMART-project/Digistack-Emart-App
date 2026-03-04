'use strict';

require('dotenv').config();

const config = {
  app: {
    name:    process.env.APP_NAME    || 'emart-book-service',
    version: process.env.APP_VERSION || '1.0.0',
    env:     process.env.NODE_ENV    || 'development',
    port:    parseInt(process.env.SERVER_PORT || process.env.PORT || '8082', 10),
  },

  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME     || 'booksdb',
    user:     process.env.DB_USER     || 'emart_books_user',
    password: process.env.DB_PASSWORD || '',
    // Connection pool
    pool: {
      min:                parseInt(process.env.DB_POOL_MIN     || '2',   10),
      max:                parseInt(process.env.DB_POOL_MAX     || '10',  10),
      idleTimeoutMillis:  parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000', 10),
    },
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },

  jwt: {
    // Must match login-service JWT_SECRET exactly
    secret:   process.env.JWT_SECRET || '',
    algorithm: 'HS256',
  },

  log: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
};

// Fail fast on missing critical config in production
if (config.app.env === 'production') {
  const required = ['DB_PASSWORD', 'JWT_SECRET'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = config;
