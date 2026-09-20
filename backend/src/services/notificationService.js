/**
 * notificationService.js
 * ------------------------------------------------------------------
 * Sends mastitis/high-risk alerts to a farmer over WhatsApp, SMS, and
 * email whenever an animal's risk score crosses ALERT_RISK_THRESHOLD
 * (default 75, i.e. "High Risk"). Each message includes the animal's
 * key readings, the current recommendation (if any), and a direct
 * link into the dashboard for that animal.
 *
 * This uses Twilio for WhatsApp/SMS and SMTP (via nodemailer) for
 * email - both are optional and OFF by default. Set the relevant
 * *_ENABLED flag and credentials in .env to turn each channel on;
 * any channel left disabled or misconfigured is skipped with a
 * warning rather than crashing the ingestion pipeline, so telemetry
 * processing is never blocked by a notification failure.
 * ------------------------------------------------------------------
 */
const env = require('../config/env');
const logger = require('../utils/logger');
const userModel = require('../models/userModel');

let twilioClient = null;
if (env.NOTIFY_SMS_ENABLED || env.NOTIFY_CALL_ENABLED || env.NOTIFY_WHATSAPP_ENABLED) {
  try {
    // eslint-disable-next-line global-require
    const twilio = require('twilio');
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    logger.warn('[notify] twilio package not installed or misconfigured - SMS/WhatsApp alerts disabled.', err.message);
  }
}

let mailTransport = null;
if (env.NOTIFY_EMAIL_ENABLED) {
  try {
    // eslint-disable-next-line global-require
    const nodemailer = require('nodemailer');
    mailTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  } catch (err) {
    logger.warn('[notify] nodemailer package not installed or misconfigured - email alerts disabled.', err.message);
  }
}

const ALERT_COPY = {
  en: { intro: 'NANDI Alert', ec: 'EC', temp: 'Skin temperature', rumination: 'Rumination change', action: 'Recommended action', view: 'View this animal' },
  hi: { intro: 'NANDI AI अलर्ट', ec: 'EC', temp: 'त्वचा का तापमान', rumination: 'जुगाली में बदलाव', action: 'सुझाया गया कदम', view: 'पशु देखें' },
  kn: { intro: 'NANDI AI ಎಚ್ಚರಿಕೆ', ec: 'EC', temp: 'ಚರ್ಮದ ತಾಪಮಾನ', rumination: 'ಜುಗಾಲಿ ಬದಲಾವಣೆ', action: 'ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮ', view: 'ಪ್ರಾಣಿಯನ್ನು ನೋಡಿ' },
};

function buildMessage({ animal, riskScore, riskLevel, reading, recommendation, language = 'en' }) {
  const copy = ALERT_COPY[language] || ALERT_COPY.en;
  const link = `${env.FRONTEND_URL}/dashboard/species/${animal.species}/${animal.id}`;
  const lines = [
    `${copy.intro}: ${animal.name} (${animal.display_tag}) is now ${riskLevel} (${riskScore}%).`,
    reading?.ec != null ? `${copy.ec}: ${reading.ec} mS/cm` : null,
    reading?.skin_temp != null ? `${copy.temp}: ${reading.skin_temp}°C` : null,
    reading?.rumination != null ? `${copy.rumination}: ${reading.rumination}%` : null,
    recommendation ? `${copy.action}: ${recommendation.action}` : null,
    `${copy.view}: ${link}`,
  ].filter(Boolean);
  return lines.join('\n');
}

async function sendMastitisAlert({ animal, owner, riskScore, riskLevel, reading, recommendation }) {
  if (riskScore < env.ALERT_RISK_THRESHOLD) return; // below the configured threshold - no alert
  const vets = owner.farm_district ? await userModel.findVetsByDistrict(owner.farm_district) : [];
  const recipients = [owner, ...vets].filter((recipient, index, all) => recipient.phone && all.findIndex((item) => item.id === recipient.id) === index);

  const jobs = [];

  recipients.forEach((recipient) => {
    const message = buildMessage({ animal, riskScore, riskLevel, reading, recommendation, language: recipient.preferred_language });
    if (env.NOTIFY_SMS_ENABLED && twilioClient) {
      jobs.push(twilioClient.messages.create({ from: env.TWILIO_SMS_FROM, to: recipient.phone, body: message })
        .catch((err) => logger.warn(`[notify] SMS send failed for ${recipient.phone}:`, err.message)));
    }
    if (env.NOTIFY_CALL_ENABLED && twilioClient) {
      const spoken = message.replace(/\n/g, '. ');
      jobs.push(twilioClient.calls.create({ from: env.TWILIO_VOICE_FROM, to: recipient.phone, twiml: `<Response><Say language="${recipient.preferred_language === 'hi' ? 'hi-IN' : recipient.preferred_language === 'kn' ? 'kn-IN' : 'en-IN'}">${spoken.replace(/[<&>]/g, '')}</Say></Response>` })
        .catch((err) => logger.warn(`[notify] Call failed for ${recipient.phone}:`, err.message)));
    }
  });

  if (jobs.length === 0) {
    logger.info(`[notify] Alert threshold crossed for ${animal.display_tag}, but no notification channels are enabled/configured.`);
    return;
  }

  await Promise.allSettled(jobs);
}

module.exports = { sendMastitisAlert };
