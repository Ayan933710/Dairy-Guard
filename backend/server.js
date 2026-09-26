const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { initSocket } = require('./src/services/socketService');
const { startMqttBridge } = require('./src/services/mqttBridge');

function startServer(port) {
  const server = http.createServer(app);

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is already in use. Retrying on ${port + 1}...`);
      startServer(port + 1);
      return;
    }

    logger.error('Server startup error:', error);
    throw error;
  });

  server.listen(port, '0.0.0.0', () => {
    initSocket(server);
    startMqttBridge();

    logger.info(`NANDI backend listening on http://localhost:${port}`);
    logger.info(`Local URL: http://localhost:${port}`);
    logger.info(`Wi-Fi / Phone APK URL: http://<YOUR_IP>:${port}/nandi.apk`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Allowed CORS origins: ${env.CLIENT_ORIGIN.join(', ')}`);
  });
}

startServer(env.PORT);

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
