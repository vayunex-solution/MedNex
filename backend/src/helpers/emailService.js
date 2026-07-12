'use strict';

const nodemailer = require('nodemailer');
const sequelize = require('../config/database');
const { decrypt } = require('./encryption');
const logger = require('../config/logger');

/**
 * Resolves SMTP configuration for a given tenant.
 * Falls back to default platform values if not configured.
 */
const resolveSmtpConfig = async (tenantId) => {
  if (!tenantId) return getPlatformDefaults();

  const [settings] = await sequelize.query(
    'SELECT `key`, value FROM plat_tenant_settings WHERE tenantId = ? AND `key` LIKE "smtp.%"',
    { replacements: [tenantId] }
  );

  const config = {};
  settings.forEach(s => {
    config[s.key.replace('smtp.', '')] = s.value;
  });

  if (!config.host || !config.user) {
    return getPlatformDefaults();
  }

  return {
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: config.secure === 'true',
    auth: {
      user: config.user,
      pass: decrypt(config.pass),
    },
    from: config.from || config.user,
    isCustom: true,
  };
};

/**
 * Returns default platform SMTP settings from environment variables.
 */
const getPlatformDefaults = () => {
  return {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT) || 2525,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || 'noreply@mednex.vayunexsolution.com',
    isCustom: false,
  };
};

/**
 * Helper to update tenant SMTP health logs in plat_tenant_settings
 */
const updateTenantSmtpHealth = async (tenantId, isSuccess, errorMsg = null) => {
  if (!tenantId) return;

  const now = new Date().toISOString();
  const status = isSuccess ? 'healthy' : 'unhealthy';

  const upsertSetting = async (key, val) => {
    await sequelize.query(
      `INSERT INTO plat_tenant_settings (tenantId, \`key\`, value) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value = ?`,
      { replacements: [tenantId, key, val, val] }
    );
  };

  await upsertSetting('smtp.status', status);
  if (isSuccess) {
    await upsertSetting('smtp.last_success', now);
  } else {
    await upsertSetting('smtp.last_failure', now);
    await upsertSetting('smtp.last_error', errorMsg || 'Unknown connection error');
  }
};

/**
 * Tests an SMTP configuration directly
 */
const testConnection = async (config) => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port),
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 8000,
  });

  await transporter.verify();
  return true;
};

/**
 * Dispatches an email using resolved transporter
 */
const sendEmail = async ({ tenantId, to, subject, html }) => {
  const config = await resolveSmtpConfig(tenantId);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
    if (config.isCustom) {
      await updateTenantSmtpHealth(tenantId, true);
    }
    logger.info(`Email sent successfully to ${to} (Subject: ${subject})`);
    return info;
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`);
    if (config.isCustom) {
      await updateTenantSmtpHealth(tenantId, false, err.message);
    }
    throw err;
  }
};

module.exports = { resolveSmtpConfig, testConnection, sendEmail };
