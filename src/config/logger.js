const winston = require('winston');
const config = require('./config');
const path = require('path');
const fs = require('fs');
const Sentry = require('@sentry/node');
const SentryTransport = require('winston-transport-sentry-node').default;
const DailyRotateFile = require('winston-daily-rotate-file');

// Ensure log directory exists

//const logDir = config.env === 'production' ? '/usr/src/node-app/logs' : path.resolve(__dirname, 'logs');
const logDir = path.resolve(__dirname, 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Initialize Sentry
if (config.env === 'production') {
  Sentry.init({
    dsn: config.sentryDsn, // Put your actual DSN here
    environment: config.env,
  });
}

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format:
    config.env === 'development'
      ? winston.format.combine(
          enumerateErrorFormat(),
          winston.format.colorize(),
          winston.format.splat(),
          winston.format.printf(({ level, message }) => `${level}: ${message}`)
        )
      : winston.format.combine(enumerateErrorFormat(), winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
      format:
        config.env === 'development'
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ level, message }) => `${level}: ${message}`)
            )
          : winston.format.uncolorize(),
    }),
    // ✅ File transport (production)
    ...(config.env === 'production'
      ? [
          new DailyRotateFile({
            filename: path.join(logDir, '%DATE%-error.log'), // Daily rotated log file for errors
            datePattern: 'YYYY-MM-DD', // Date format
            level: 'error',
            maxSize: '20m', // Maximum file size (20MB in this case)
            maxFiles: '30d', // Keep logs for 30 days
          }),
          new DailyRotateFile({
            filename: path.join(logDir, '%DATE%-combined.log'), // Daily rotated log file for all logs
            datePattern: 'YYYY-MM-DD', // Date format
            level: 'info',
            maxSize: '50m', // Maximum file size (50MB in this case)
            maxFiles: '30d', // Keep logs for 30 days
          }),

          // ✅ Sentry transport
          new SentryTransport({
            sentry: {
              dsn: config.sentryDsn,
              environment: config.env,
            },
            level: 'error',
          }),
        ]
      : []),
  ],
});

module.exports = logger;
