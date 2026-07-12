'use strict';

const sequelize = require('../config/database');
const { encrypt } = require('../helpers/encryption');
const { testConnection } = require('../helpers/emailService');
const { success, badRequest } = require('../helpers/response');

const getSettings = async (req, res) => {
  const tenantId = req.user.tenantId || 1;
  const [rows] = await sequelize.query(
    'SELECT `key`, value FROM plat_tenant_settings WHERE tenantId = ?',
    { replacements: [tenantId] }
  );

  const settings = {};
  rows.forEach(r => {
    // Hide encrypted values from UI payload
    if (r.key === 'smtp.pass') {
      settings[r.key] = '••••••••••••';
    } else {
      settings[r.key] = r.value;
    }
  });

  return success(res, settings);
};

const updateSettings = async (req, res) => {
  const tenantId = req.user.tenantId || 1;
  const updates = req.body; // Key-Value pair map

  for (const [key, value] of Object.entries(updates)) {
    let finalValue = value;
    // Encrypt SMTP password at rest
    if (key === 'smtp.pass') {
      if (value === '••••••••••••' || !value) {
        continue; // Skip updating if placeholder matches or empty
      }
      finalValue = encrypt(value);
    }

    await sequelize.query(
      `INSERT INTO plat_tenant_settings (tenantId, \`key\`, value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = ?`,
      { replacements: [tenantId, key, finalValue, finalValue] }
    );
  }

  return success(res, null, 'Settings saved successfully');
};

const testSmtpSettings = async (req, res) => {
  const { host, port, secure, user, pass } = req.body;
  if (!host || !user) {
    return badRequest(res, 'host and user are required');
  }

  let testPass = pass;
  if (pass === '••••••••••••') {
    // Retrieve stored encrypted pass
    const tenantId = req.user.tenantId || 1;
    const [rows] = await sequelize.query(
      'SELECT value FROM plat_tenant_settings WHERE tenantId = ? AND `key` = "smtp.pass" LIMIT 1',
      { replacements: [tenantId] }
    );
    if (rows.length > 0) {
      const { decrypt } = require('../helpers/encryption');
      testPass = decrypt(rows[0].value);
    }
  }

  try {
    await testConnection({
      host,
      port,
      secure: secure === 'true' || secure === true,
      user,
      pass: testPass,
    });
    return success(res, null, 'SMTP Connection test succeeded!');
  } catch (err) {
    return res.status(400).json({ success: false, message: `SMTP Connection test failed: ${err.message}` });
  }
};

module.exports = { getSettings, updateSettings, testSmtpSettings };
