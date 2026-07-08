'use strict';

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
const securityHeaders = require('./middleware/securityHeaders');
app.use(securityHeaders);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      // Production
      'https://sdk.vayunexsolution.com',
      'https://www.sdk.vayunexsolution.com',
      // Env override
      process.env.FRONTEND_URL,
      // Local dev
      'http://localhost:3100',
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean);

    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Idempotency-Key'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: 'Too many requests' });
app.use('/api/', limiter);

// ─── Request Context & Identification Pipeline ─────────────────────────────────
const requestId = require('./middleware/requestId');
const contextMiddleware = require('./middleware/context');
const requestLogger = require('./middleware/requestLogger');

app.use(requestId);
app.use(contextMiddleware);
app.use(requestLogger);

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static files (uploads) ───────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
const v1Routes = require('./routes/v1');
const v2Routes = require('./routes/v2');
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);


// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
