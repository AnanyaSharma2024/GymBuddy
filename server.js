const http = require('http');
const env = require('./src/config/env');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/sockets');
const logger = require('./src/utils/logger');

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  const port = Number(env.PORT) || 5000;
  server.listen(port, () => {
    logger.info(`Server listening on port ${port} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: reason?.message || reason });
  });
}

start();
