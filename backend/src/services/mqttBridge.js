const mqtt = require('mqtt');
const env = require('./../config/env');
const logger = require('./../utils/logger');
const { ingestTelemetry } = require('./telemetryIngestService');

let client = null;

function startMqttBridge() {
  if (!env.MQTT_ENABLED) {
    logger.info('[mqtt] MQTT_ENABLED=false - skipping broker bridge (using HTTP ingestion route only).');
    return null;
  }

  client = mqtt.connect(env.MQTT_BROKER_URL, {
    username: env.MQTT_USERNAME || undefined,
    password: env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    logger.info(`[mqtt] connected to broker at ${env.MQTT_BROKER_URL}`);
    client.subscribe(env.MQTT_TELEMETRY_TOPIC, (err) => {
      if (err) logger.error('[mqtt] subscribe failed:', err.message);
      else logger.info(`[mqtt] subscribed to topic: ${env.MQTT_TELEMETRY_TOPIC}`);
    });
  });

  client.on('message', async (topic, messageBuffer) => {
    try {
      const payload = JSON.parse(messageBuffer.toString('utf8'));
      logger.debug(`[mqtt] message on ${topic}:`, payload);
      await ingestTelemetry(payload);
    } catch (err) {
      logger.error(`[mqtt] failed to process message on ${topic}: ${err.message}`);
    }
  });

  client.on('error', (err) => logger.error('[mqtt] connection error:', err.message));

  return client;
}

module.exports = { startMqttBridge };
