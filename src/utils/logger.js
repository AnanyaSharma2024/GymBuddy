// Structured logging with winston.
// RULE: never log passwords, OAuth codes, tokens, cookies, or secrets.
// This redact() helper is applied defensively to any metadata object passed
// to logger calls that might accidentally include sensitive fields.
const winston = require('winston');
const env = require('../config/env');

const SENSITIVE_KEYS = [
  'password', 'token', 'accessToken', 'refreshToken', 'authorization',
  'cookie', 'secret', 'code', 'clientSecret', 'idToken', 'privateKey',
];

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object') {
      clone[key] = redact(clone[key]);
    }
  }
  return clone;
}

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const safeMeta = redact(meta);
      const metaStr = Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : '';
      return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
