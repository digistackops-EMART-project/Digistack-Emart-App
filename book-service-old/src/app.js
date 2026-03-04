'use strict';

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const config        = require('./config/config');
const logger        = require('./utils/logger');
const bookRoutes    = require('./routes/bookRoutes');
const healthRoutes  = require('./routes/healthRoutes');
const { errorHandler } = require('./middleware/errorHandler');

// ── Build app ─────────────────────────────────────────────────
function createApp() {
  const app = express();

  // ── Security headers ─────────────────────────────────────────
  app.use(helmet());

  // ── CORS — accept requests from Nginx (same origin in prod) ──
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── Request parsing ───────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // ── HTTP access log ───────────────────────────────────────────
  if (config.app.env !== 'test') {
    app.use(morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    }));
  }

  // ── Routes ────────────────────────────────────────────────────
  app.use('/health',         healthRoutes);
  app.use('/api/v1/books',   bookRoutes);

  // ── 404 catch-all ─────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
  });

  // ── Central error handler ─────────────────────────────────────
  app.use(errorHandler);

  return app;
}

// ── Start server ──────────────────────────────────────────────
if (require.main === module) {
  const db = require('./config/database');

  db.checkConnection()
    .then(() => {
      logger.info({ msg: 'Database connection verified' });
      const app = createApp();
      const server = app.listen(config.app.port, () => {
        logger.info({
          msg:     'Book Service started',
          port:    config.app.port,
          env:     config.app.env,
          version: config.app.version,
        });
      });

      // Graceful shutdown
      const shutdown = async (signal) => {
        logger.info({ msg: `${signal} received — shutting down` });
        server.close(async () => {
          await db.close();
          process.exit(0);
        });
        // Force exit after 10s
        setTimeout(() => process.exit(1), 10000);
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT',  () => shutdown('SIGINT'));
    })
    .catch((err) => {
      logger.error({ msg: 'Failed to connect to database on startup', error: err.message });
      process.exit(1);
    });
}

module.exports = { createApp };
