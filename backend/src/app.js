const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.NODE_ENV !== 'production' || env.CLIENT_ORIGIN.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' })); // generous limit for batched telemetry payloads
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300, // generous for a dashboard + multiple IoT devices polling
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use('/api', apiRoutes);

const path = require('path');
const fs = require('fs');

app.get('/nandi.apk', (req, res) => {
  const apkPath = path.resolve(__dirname, '../nandi.apk');
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'nandi.apk');
  } else {
    res.status(404).json({ error: 'APK not found. Please build the Android app first.' });
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    demoVideoUrl: process.env.DEMO_VIDEO_URL || null
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'NANDI backend is running. See /api/health for status.',
    apkDownload: '/nandi.apk'
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
