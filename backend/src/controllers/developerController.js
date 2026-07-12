'use strict';

const crypto = require('crypto');
const sequelize = require('../config/database');
const { success, badRequest, notFound } = require('../helpers/response');

const generateKey = async (req, res) => {
  const { name, scopes = ['*'], expiresInDays = 365, rateLimit = 60 } = req.body;
  if (!name) return badRequest(res, 'name is required');

  const tenantId = req.user.tenantId || 1; // Fallback for testing
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const prefix = process.env.NODE_ENV === 'production' ? 'mn_live_' : 'mn_test_';
  const rawKey = `${prefix}${randomBytes}`;

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await sequelize.query(
    `INSERT INTO plat_api_keys (tenantId, name, keyHash, keyPrefix, scopes, rateLimit, expiresAt, createdBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    {
      replacements: [
        tenantId,
        name,
        keyHash,
        prefix,
        JSON.stringify(scopes),
        rateLimit,
        expiresAt,
        req.user.id,
      ]
    }
  );

  return success(res, {
    name,
    apiKey: rawKey, // Shown only once!
    expiresAt,
    scopes,
  }, 'API Key generated successfully. Copy the key as it won\'t be shown again.');
};

const listKeys = async (req, res) => {
  const tenantId = req.user.tenantId || 1;
  const [keys] = await sequelize.query(
    `SELECT id, name, keyPrefix, scopes, rateLimit, expiresAt, revokedAt, lastUsedAt, createdAt 
     FROM plat_api_keys WHERE tenantId = ? ORDER BY createdAt DESC`,
    { replacements: [tenantId] }
  );

  const formatted = keys.map(k => ({
    ...k,
    scopes: JSON.parse(k.scopes || '[]')
  }));

  return success(res, formatted);
};

const revokeKey = async (req, res) => {
  const { id } = req.params;
  await sequelize.query(
    'UPDATE plat_api_keys SET revokedAt = NOW() WHERE id = ? AND tenantId = ?',
    { replacements: [id, req.user.tenantId || 1] }
  );
  return success(res, null, 'API Key revoked');
};

const createWebhook = async (req, res) => {
  const { url, events = ['*'] } = req.body;
  if (!url) return badRequest(res, 'url is required');

  const tenantId = req.user.tenantId || 1;
  const secretKey = 'whsec_' + crypto.randomBytes(24).toString('hex');

  await sequelize.query(
    `INSERT INTO plat_webhooks (tenantId, url, secretKey, events, isActive, createdAt)
     VALUES (?, ?, ?, ?, 1, NOW())`,
    { replacements: [tenantId, url, secretKey, JSON.stringify(events)] }
  );

  return success(res, { url, secretKey, events }, 'Webhook created successfully');
};

const listWebhooks = async (req, res) => {
  const tenantId = req.user.tenantId || 1;
  const [hooks] = await sequelize.query(
    'SELECT id, url, secretKey, events, isActive, createdAt FROM plat_webhooks WHERE tenantId = ? ORDER BY createdAt DESC',
    { replacements: [tenantId] }
  );

  const formatted = hooks.map(h => ({
    ...h,
    events: JSON.parse(h.events || '[]')
  }));

  return success(res, formatted);
};

const deleteWebhook = async (req, res) => {
  const { id } = req.params;
  await sequelize.query(
    'DELETE FROM plat_webhooks WHERE id = ? AND tenantId = ?',
    { replacements: [id, req.user.tenantId || 1] }
  );
  return success(res, null, 'Webhook deleted');
};

const getWebhookLogs = async (req, res) => {
  // Queries outbox jobs to retrieve webhook histories
  const [logs] = await sequelize.query(
    `SELECT id, payload, status, attempts, nextRunAt, finishedAt, lastError, createdAt 
     FROM plat_outbox_jobs 
     WHERE jobType = 'webhook-dispatch' AND JSON_EXTRACT(payload, '$.tenantId') = ?
     ORDER BY createdAt DESC LIMIT 50`,
    { replacements: [req.user.tenantId || 1] }
  );

  const formatted = logs.map(l => {
    let payload = {};
    try { payload = JSON.parse(l.payload); } catch (_) {}
    return {
      id: l.id,
      event: payload.event,
      url: payload.url,
      status: l.status,
      attempts: l.attempts,
      error: l.lastError,
      timestamp: l.createdAt,
    };
  });

  return success(res, formatted);
};

const getApiDocs = (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  return res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>MedNex Developer API Documentation</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; margin: 0; background: #f8fafc; color: #1e293b; line-height: 1.6; }
        header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fff; padding: 2.5rem; }
        .container { max-width: 1000px; margin: 2rem auto; padding: 0 1.5rem; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 2rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; }
        h1 { margin: 0 0 0.5rem; font-weight: 800; font-size: 2rem; }
        h2 { font-weight: 700; font-size: 1.35rem; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
        h3 { font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
        code, pre { font-family: 'JetBrains Mono', monospace; background: #f1f5f9; border-radius: 6px; font-size: 0.9rem; }
        code { padding: 0.2rem 0.4rem; color: #0f172a; }
        pre { padding: 1.2rem; overflow-x: auto; color: #334155; border: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .badge-get { background: #dcfce7; color: #15803d; }
        .badge-post { background: #eff6ff; color: #1d4ed8; }
        .endpoint-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .endpoint-url { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; }
      </style>
    </head>
    <body>
      <header>
        <div style="max-width: 1000px; margin: 0 auto;">
          <span class="badge" style="background:#3b82f6;color:#fff;margin-bottom:0.5rem;">External APIs</span>
          <h1>MedNex SaaS Developer Console</h1>
          <p style="margin: 0; color: #94a3b8; font-size: 0.95rem;">Version 1.0.0 (v1/external)</p>
        </div>
      </header>
      <div class="container">
        <div class="card">
          <h2>Authentication</h2>
          <p>All external integration requests must include your generated API key passed as the <code>x-api-key</code> HTTP header:</p>
          <pre>x-api-key: mn_live_abc123...</pre>
        </div>

        <div class="card">
          <h2>API Reference</h2>
          
          <h3>1. Fetch Current Inventory</h3>
          <div class="endpoint-row">
            <span class="badge badge-get">GET</span>
            <span class="endpoint-url">/api/v1/external/inventory</span>
          </div>
          <p>Returns a comprehensive list of all active stocks, medicines, batches, and current available quantities.</p>

          <h3>2. Fetch Customers List</h3>
          <div class="endpoint-row">
            <span class="badge badge-get">GET</span>
            <span class="endpoint-url">/api/v1/external/customers</span>
          </div>
          <p>Returns customer details including names, contact emails, and GST numbers associated with the tenant.</p>

          <h3>3. Record External Sale Bill</h3>
          <div class="endpoint-row">
            <span class="badge badge-post">POST</span>
            <span class="endpoint-url">/api/v1/external/sales</span>
          </div>
          <p>Posts a completed sale transaction to register in MedNex ERP and decrements batch stocks accordingly.</p>
        </div>

        <div class="card">
          <h2>Webhook Signing &amp; Verification</h2>
          <p>MedNex signs outbound webhook payloads using an <code>HMAC SHA-256</code> signature computed using the webhook secret token. Validate the signature matches the header value below:</p>
          <pre>X-MedNex-Signature: &lt;computed-hmac-hash&gt;</pre>
        </div>
      </div>
    </body>
    </html>
  `);
};

module.exports = {
  generateKey,
  listKeys,
  revokeKey,
  createWebhook,
  listWebhooks,
  deleteWebhook,
  getWebhookLogs,
  getApiDocs,
};
