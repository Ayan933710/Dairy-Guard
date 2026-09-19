/**
 * Server entry point.
 * Boots the HTTP server, attaches Socket.io for real-time dashboard
 * updates, and starts the optional MQTT bridge for ESP32-S3 devices
 * that publish telemetry via a LoRa gateway / MQTT broker instead of
 * calling the HTTP ingestion route directly.
 */
const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { initSocket } = require('./src/services/socketService');
const { startMqttBridge } = require('./src/services/mqttBridge');

const httpServer = http.createServer(app);

function startServer(port) {
  const server = http.createServer(app);

  initSocket(server);
  startMqttBridge();

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is already in use. Retrying on ${port + 1}...`);
      startServer(port + 1);
      return;
    }

    logger.error('Server startup error:', error);
    throw error;
  });

  server.listen(port, () => {
    logger.info(`NANDI backend listening on http://localhost:${port}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Allowed CORS origins: ${env.CLIENT_ORIGIN.join(', ')}`);
  });
}

startServer(env.PORT);

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
