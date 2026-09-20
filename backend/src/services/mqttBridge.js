/**
 * MQTT broker bridge.
 *
 * If your ESP32-S3 firmware / NANDI Hub publishes telemetry over
 * MQTT (recommended for LoRa gateways relaying many devices) instead
 * of calling the HTTP ingestion route directly, enable this bridge:
 *
 *   MQTT_ENABLED=true
 *   MQTT_BROKER_URL=mqtt://localhost:1883
 *   MQTT_TELEMETRY_TOPIC=nandi/+/telemetry   (the "+" wildcard = device_id)
 *
 * Expected message payload (JSON, UTF-8) - identical shape to the
 * HTTP ingestion route's body, see routes/telemetryRoutes.js:
 *   {
 *     "device_id": "COLLAR-C104-AA21",
 *     "device_type": "cup",
 *     "farm_id": "K7QX9F2A",
 *     "rfid_tag": "900000000000104",
 *     "quarter": "LF",
 *     "ec": 6.8, "ph": 6.9, "viscosity_torque": 58,
 *     "yield": 2.1, "rumination": -14, "skin_temp": 39.6
 *   }
 *
 * `farm_id` is the 8-character ID shown to the farmer after signup - it
 * must be configured into the hub/collar/cup once, and every reading is
 * rejected unless it matches the farm_id of the animal's actual owner.
 *
 * For local dev without a real broker, install Mosquitto:
 *   macOS:   brew install mosquitto && brew services start mosquitto
 *   Ubuntu:  sudo apt install mosquitto mosquitto-clients
 * then simulate a device with:
 *   mosquitto_pub -t nandi/COLLAR-01/telemetry -m '{"device_id":"COLLAR-01","rfid_tag":"900000000000104","ec":7.1}'
 */
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
