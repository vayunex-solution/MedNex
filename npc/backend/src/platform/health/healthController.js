'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const sequelize = require('../../config/database');
const logger = require('../../shared/logger');
const cacheManager = require('../../shared/cache');
const jobQueue = require('../../shared/jobs/JobQueue');

const checkHealth = async (req, res) => {
  const healthInfo = {
    status: 'UP',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    checks: {},
    metrics: {}
  };

  // Try to load package version
  try {
    const pkg = require(path.join(process.cwd(), 'package.json'));
    healthInfo.version = pkg.version;
  } catch {
    // Ignore if package.json not found
  }

  // 1. Database Check & Migration Version
  const dbStart = Date.now();
  try {
    await sequelize.authenticate();
    const latency = Date.now() - dbStart;

    // Get current migration version from SequelizeMeta
    const [latestMigration] = await sequelize.query(
      'SELECT name FROM SequelizeMeta ORDER BY name DESC LIMIT 1',
      { type: sequelize.QueryTypes.SELECT, logging: false }
    ).catch(() => [{ name: 'none' }]);

    healthInfo.checks.database = {
      status: 'UP',
      latencyMs: latency,
      migrationVersion: latestMigration ? latestMigration.name : 'none'
    };
  } catch (err) {
    healthInfo.status = 'DOWN';
    healthInfo.checks.database = {
      status: 'DOWN',
      error: err.message,
    };
  }

  // 2. Cache Check & Metrics
  try {
    const provider = cacheManager.getProvider();
    await provider.set('health-check-key', 'ok', 5);
    const val = await provider.get('health-check-key');
    if (val === 'ok') {
      healthInfo.checks.cache = { status: 'UP' };
    } else {
      throw new Error('Cache verification mismatch');
    }
    // Set cache metrics
    healthInfo.metrics.cache = cacheManager.getMetrics();
  } catch (err) {
    healthInfo.checks.cache = {
      status: 'DOWN',
      error: err.message
    };
  }

  // 3. Queue Check & Metrics
  try {
    const queueMetrics = await jobQueue.getMetrics();
    healthInfo.checks.queue = { status: 'UP' };
    healthInfo.metrics.queue = queueMetrics;
  } catch (err) {
    healthInfo.checks.queue = {
      status: 'DOWN',
      error: err.message
    };
  }

  // 4. SMTP Connection Check
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      } : undefined,
      timeout: 2000
    });
    await transporter.verify();
    healthInfo.checks.smtp = { status: 'UP' };
  } catch (err) {
    // If SMTP is down, we don't fail the whole app health (UP but SMTP degraded)
    healthInfo.checks.smtp = {
      status: 'DEGRADED',
      error: err.message
    };
  }

  // 5. Storage Write/Read Check
  const storageStart = Date.now();
  try {
    const uploadsDir = path.join(process.cwd(), 'src', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const tempFilename = `health-${Date.now()}.tmp`;
    const tempFilePath = path.join(uploadsDir, tempFilename);
    
    fs.writeFileSync(tempFilePath, 'health_ok');
    const content = fs.readFileSync(tempFilePath, 'utf8');
    fs.unlinkSync(tempFilePath);

    if (content === 'health_ok') {
      healthInfo.checks.storage = {
        status: 'UP',
        latencyMs: Date.now() - storageStart,
      };
    } else {
      throw new Error('Data validation mismatch');
    }
  } catch (err) {
    healthInfo.status = 'DOWN';
    healthInfo.checks.storage = {
      status: 'DOWN',
      error: err.message,
    };
  }

  // 6. System Resource Usage
  const mem = process.memoryUsage();
  healthInfo.checks.memory = {
    status: 'UP',
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    rssMb: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
  };

  // OS Info
  const cpus = os.cpus();
  healthInfo.checks.cpu = {
    status: 'UP',
    cores: cpus.length,
    model: cpus[0] ? cpus[0].model : 'unknown',
    loadAvg: os.loadavg(),
    freeMemGb: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
    totalMemGb: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100
  };

  // 7. Business Telemetry
  const telemetryCollector = require('../../shared/telemetry');
  healthInfo.metrics.business = telemetryCollector.getMetrics();

  // 8. OpenTelemetry Span Metrics
  const otelTracker = require('../../shared/telemetry/otel');
  healthInfo.metrics.telemetry = otelTracker.getHistogramStats();

  const statusCode = healthInfo.status === 'UP' ? 200 : 503;
  return res.status(statusCode).json(healthInfo);
};

module.exports = { checkHealth };
