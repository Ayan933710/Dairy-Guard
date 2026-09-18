/**
 * Express application setup - middleware stack + route mounting.
 * Kept separate from server.js so it can be imported directly in
 * tests (supertest) without binding a real port / socket.io server.
 */
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
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' })); // generous limit for batched telemetry payloads
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Basic protection against brute-force login attempts / device flooding
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300, // generous for a dashboard + multiple IoT devices polling
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'DairyGuard AI backend is running. See /api/health for status.' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
