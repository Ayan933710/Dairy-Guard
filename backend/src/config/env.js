require('dotenv').config();

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

const INSECURE_JWT_FALLBACK = 'insecure_dev_secret_change_me';
const INSECURE_DEVICE_FALLBACK = 'insecure_dev_device_key';

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_ORIGIN: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: bool(process.env.DATABASE_SSL, false),

  JWT_SECRET: process.env.JWT_SECRET || INSECURE_JWT_FALLBACK,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,

  DEVICE_INGEST_KEY: process.env.DEVICE_INGEST_KEY || INSECURE_DEVICE_FALLBACK,

  MQTT_ENABLED: bool(process.env.MQTT_ENABLED, false),
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  MQTT_USERNAME: process.env.MQTT_USERNAME || '',
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || '',
  MQTT_TELEMETRY_TOPIC: process.env.MQTT_TELEMETRY_TOPIC || 'nandi/+/telemetry',

  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_SERVICE_TIMEOUT_MS: parseInt(process.env.AI_SERVICE_TIMEOUT_MS, 10) || 5000,
  AI_SERVICE_ENABLED: bool(process.env.AI_SERVICE_ENABLED, false),
  AI_MODEL_VERSION: process.env.AI_MODEL_VERSION || 'nandi_ai_v2.2_calibrated',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ALERT_RISK_THRESHOLD: parseInt(process.env.ALERT_RISK_THRESHOLD, 10) || 75,

  NOTIFY_WHATSAPP_ENABLED: bool(process.env.NOTIFY_WHATSAPP_ENABLED, false),
  NOTIFY_SMS_ENABLED: bool(process.env.NOTIFY_SMS_ENABLED, false),
  NOTIFY_CALL_ENABLED: bool(process.env.NOTIFY_CALL_ENABLED, false),
  NOTIFY_EMAIL_ENABLED: bool(process.env.NOTIFY_EMAIL_ENABLED, false),

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || '', // e.g. 'whatsapp:+14155238886'
  TWILIO_SMS_FROM: process.env.TWILIO_SMS_FROM || '',
  TWILIO_VOICE_FROM: process.env.TWILIO_VOICE_FROM || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  ALERT_FROM_EMAIL: process.env.ALERT_FROM_EMAIL || 'alerts@nandi.ai',

  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};

if (!env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[config] DATABASE_URL is not set. Copy .env.example to .env and fill it in before starting the server.'
  );
}

if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === INSECURE_JWT_FALLBACK) {
    throw new Error('FATAL: JWT_SECRET must be set to a strong random value in production. Server refusing to start.');
  }
  if (env.DEVICE_INGEST_KEY === INSECURE_DEVICE_FALLBACK) {
    throw new Error('FATAL: DEVICE_INGEST_KEY must be set to a strong random value in production. Server refusing to start.');
  }
}

module.exports = env;
