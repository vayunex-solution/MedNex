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
const authRoutes = require('./routes/authRoutes');
const masterRoutes = require('./routes/masterRoutes');
const apiRoutes = require('./routes/index');

const app = express();

// ─── CORS (Nuclear mode - manual headers, no package dependency) ──────────────
// Must be FIRST middleware before anything else
app.use((req, res, next) => {
  // Always set CORS headers on every response
  const allowedOrigins = [
    'https://mednex.vayunexsolution.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ];
  const requestOrigin = req.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  } else if (requestOrigin) {
    // Allow any origin during development / unknown origins
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://mednex.vayunexsolution.com');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, X-Correlation-ID');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Immediately respond to preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});



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

app.use('/api/auth', authRoutes);
app.use('/api', masterRoutes);
app.use('/api', apiRoutes);
app.use('/api/platform', require('./routes/platform'));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
