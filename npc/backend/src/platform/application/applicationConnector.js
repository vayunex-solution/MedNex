'use strict';

const crypto = require('crypto');

class ApplicationConnector {
  constructor(appRecord, manifestVersion = 'v1') {
    this.app = appRecord;
    this.manifest = this._resolveManifest(appRecord.manifest, manifestVersion);
  }

  _resolveManifest(rawManifest, version) {
    if (!rawManifest) {
      throw new Error('Application manifest is empty');
    }
    const config = typeof rawManifest === 'string' ? JSON.parse(rawManifest) : rawManifest;
    const versionConfig = config.versions?.[version] || config;
    if (!versionConfig) {
      throw new Error(`Manifest version ${version} not found in configuration`);
    }
    return versionConfig;
  }

  async provision(payload) {
    return this._dispatch('provision', payload);
  }

  async deprovision(payload) {
    return this._dispatch('deprovision', payload);
  }

  async suspend(payload) {
    return this._dispatch('suspend', payload);
  }

  async resume(payload) {
    return this._dispatch('resume', payload);
  }

  async sync(payload) {
    return this._dispatch('sync', payload);
  }

  async rotateSecrets(payload) {
    return this._dispatch('rotateSecrets', payload);
  }

  async health() {
    return this._dispatch('health', null, 'GET');
  }

  async _dispatch(action, body, method = 'POST') {
    const endpoint = this.manifest.endpoints?.[action];
    if (!endpoint) {
      throw new Error(`Endpoint for action ${action} is not defined in manifest`);
    }

    const baseUrl = this.app.productionUrl || this.app.stagingUrl || this.app.developmentUrl;
    if (!baseUrl) {
      throw new Error('No configured URL found for application connector');
    }

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `${cleanBaseUrl}${cleanEndpoint}`;

    const bodyStr = body ? JSON.stringify(body) : '';
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signatureInput = `${timestamp}:${nonce}:${bodyStr}`;
    
    // Generate HMAC signature for request integrity
    const hmac = crypto.createHmac('sha256', this.app.clientSecret || 'default_sec_val')
                       .update(signatureInput)
                       .digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'X-NPC-Client-Id': this.app.clientId || '',
      'X-NPC-Signature': hmac,
      'X-NPC-Timestamp': timestamp,
      'X-NPC-Nonce': nonce,
      'X-NPC-Version': this.manifest.version || '1.0.0',
      'X-Correlation-ID': body?.correlationId || crypto.randomUUID()
    };

    try {
      const response = await fetch(targetUrl, {
        method,
        headers,
        body: method === 'GET' ? undefined : bodyStr,
        signal: AbortSignal.timeout(this.manifest.timeoutMs || 15000)
      });

      const responseBody = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        status: response.status,
        data: responseBody
      };
    } catch (err) {
      return {
        ok: false,
        status: 500,
        error: err.message
      };
    }
  }
}

module.exports = ApplicationConnector;
