'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('../config/config');

const logger = createLogger({
  level: config.log.level,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    config.app.env === 'production'
      ? format.json()
      : format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level.toUpperCase()} ${message}${metaStr}`;
        })
  ),
  transports: [new transports.Console()],
});

module.exports = logger;
