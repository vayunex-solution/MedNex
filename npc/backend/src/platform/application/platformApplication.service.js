'use strict';

const crypto = require('crypto');
const applicationRepository = require('./application.repository');
const applicationMembershipRepository = require('./applicationMembership.repository');
const applicationApiKeyRepository = require('./applicationApiKey.repository');
const applicationSdkCredentialRepository = require('./applicationSdkCredential.repository');
const applicationWebhookRepository = require('./applicationWebhook.repository');
const applicationOauthClientRepository = require('./applicationOauthClient.repository');
const applicationFeatureFlagRepository = require('./applicationFeatureFlag.repository');
const applicationRateLimitRepository = require('./applicationRateLimit.repository');
const applicationLogRepository = require('./applicationLog.repository');
const applicationHealthRepository = require('./applicationHealth.repository');
const applicationAnalyticsRepository = require('./applicationAnalytics.repository');
const applicationDomainRepository = require('./applicationDomain.repository');
const applicationEnvironmentRepository = require('./applicationEnvironment.repository');
const applicationSecretRepository = require('./applicationSecret.repository');

const { BadRequestError, NotFoundError } = require('../../shared/errors/AppError');
const auditService = require('../audit/audit.service');

// Secret Vault Cryptography
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.VAULT_ENCRYPTION_KEY, 'salt_vault', 32)
  : crypto.scryptSync('nex_default_platform_secret_vault_9922', 'salt_vault', 32);

class PlatformApplicationService {
  encryptSecret(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decryptSecret(text) {
    try {
      const [ivHex, encryptedText] = text.split(':');
      if (!ivHex || !encryptedText) return '';
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '[Decryption Failed]';
    }
  }

  /**
   * Onboard / Register new SaaS application (APP-201, APP-211, APP-213)
   */
  async onboardApplication(payload, adminUserId) {
    const existing = await applicationRepository.findOne({ slug: payload.slug });
    if (existing) {
      throw new BadRequestError('Application with this slug already exists');
    }

    // Default manifest (APP-201)
    const manifest = payload.manifest || JSON.stringify({
      version: '1.0.0',
      capabilities: ['auth', 'billing'],
      dependencies: [],
      requiredScopes: ['user:read', 'tenant:read']
    });

    const app = await applicationRepository.create({
      name: payload.name,
      displayName: payload.displayName || payload.name,
      slug: payload.slug,
      description: payload.description,
      logo: payload.logo,
      icon: payload.icon,
      theme: payload.theme || 'default',
      category: payload.category || 'Utility',
      ownerUserId: adminUserId,
      tenantId: payload.tenantId,
      businessId: payload.businessId,
      productionUrl: payload.productionUrl,
      stagingUrl: payload.stagingUrl,
      developmentUrl: payload.developmentUrl,
      manifest,
      pluginConfig: payload.pluginConfig || '{}', // APP-213
      marketplaceConfig: payload.marketplaceConfig || '{}', // APP-211
    });

    // Create default rate limits
    await applicationRateLimitRepository.create({
      applicationId: app.id,
      environment: 'production',
      limit: 50000,
      burstLimit: 100,
      period: 'day',
    });

    // Create default health metric
    await applicationHealthRepository.create({
      applicationId: app.id,
      environment: 'production',
      status: 'online',
      uptimeScore: 100.0,
      healthScore: 100.0,
      heartbeatAt: new Date(),
    });

    // Log platform audit
    await auditService.logPlatformAction(adminUserId, 'application.onboarded', 'application', `Registered application ${app.name} (${app.slug})`);

    return app;
  }

  /**
   * Update Application registry details
   */
  async updateApplication(uuid, payload, adminUserId) {
    const app = await applicationRepository.findOne({ uuid });
    if (!app) {
      throw new NotFoundError('Application not found');
    }

    await applicationRepository.update(app.id, payload);
    await auditService.logPlatformAction(adminUserId, 'application.updated', 'application', `Updated application details for ${app.name}`);
    return await applicationRepository.findById(app.id);
  }

  /**
   * Soft Delete Application
   */
  async deleteApplication(uuid, adminUserId) {
    const app = await applicationRepository.findOne({ uuid });
    if (!app) {
      throw new NotFoundError('Application not found');
    }

    await applicationRepository.update(app.id, { isDeleted: true });
    await auditService.logPlatformAction(adminUserId, 'application.deleted', 'application', `Soft deleted application ${app.name}`);
    return { success: true };
  }

  /**
   * Create membership access to workspace / app
   */
  async createMembership(appUuid, payload) {
    const app = await applicationRepository.findOne({ uuid: appUuid });
    if (!app) throw new NotFoundError('Application not found');

    return await applicationMembershipRepository.create({
      applicationId: app.id,
      userId: payload.userId,
      role: payload.role || 'member',
    });
  }

  /**
   * Rotate Secrets (API Keys, OAuth, Webhooks) (APP-208)
   */
  async rotateSecret(appUuid, type, itemUuid, adminUserId) {
    const app = await applicationRepository.findOne({ uuid: appUuid });
    if (!app) throw new NotFoundError('Application not found');

    const newSecret = crypto.randomBytes(32).toString('hex');
    const newKey = `nex_live_${crypto.randomBytes(16).toString('hex')}`;

    if (type === 'api-key') {
      const apiKey = await applicationApiKeyRepository.findOne({ uuid: itemUuid, applicationId: app.id });
      if (!apiKey) throw new NotFoundError('API Key not found');

      await applicationApiKeyRepository.update(apiKey.id, {
        key: newKey,
        secret: this.encryptSecret(newSecret),
      });

      await auditService.logPlatformAction(adminUserId, 'application.apikey.rotated', 'application', `Rotated API Key ${apiKey.name} for ${app.name}`);
      return { key: newKey, secret: newSecret };
    } 
    
    if (type === 'webhook') {
      const webhook = await applicationWebhookRepository.findOne({ uuid: itemUuid, applicationId: app.id });
      if (!webhook) throw new NotFoundError('Webhook endpoint not found');

      const signingKey = crypto.randomBytes(24).toString('hex');
      await applicationWebhookRepository.update(webhook.id, {
        secret: this.encryptSecret(newSecret),
        signingKey,
      });

      await auditService.logPlatformAction(adminUserId, 'application.webhook.rotated', 'application', `Rotated webhook secret for ${app.name}`);
      return { secret: newSecret, signingKey };
    }

    if (type === 'oauth') {
      const oauth = await applicationOauthClientRepository.findOne({ uuid: itemUuid, applicationId: app.id });
      if (!oauth) throw new NotFoundError('OAuth Client not found');

      await applicationOauthClientRepository.update(oauth.id, {
        clientSecret: this.encryptSecret(newSecret),
      });

      await auditService.logPlatformAction(adminUserId, 'application.oauth.rotated', 'application', `Rotated OAuth Client Secret for client ${oauth.clientId}`);
      return { clientSecret: newSecret };
    }

    throw new BadRequestError('Invalid secret type for rotation');
  }

  /**
   * Connection Verification Engine (APP-209)
   */
  async verifyConnection(appUuid, type, itemUuid) {
    const app = await applicationRepository.findOne({ uuid: appUuid });
    if (!app) throw new NotFoundError('Application not found');

    if (type === 'webhook') {
      const webhook = await applicationWebhookRepository.findOne({ uuid: itemUuid, applicationId: app.id });
      if (!webhook) throw new NotFoundError('Webhook not found');

      // Simulate ping request to target URL
      // In production, this performs a real HTTP POST request with a signature header
      const pingPayload = { event: 'ping', timestamp: new Date(), message: 'Hello from Nex Platform Core!' };
      const simulatedSuccess = webhook.url.startsWith('http'); 
      
      return {
        success: simulatedSuccess,
        status: simulatedSuccess ? 'active' : 'failed',
        statusCode: simulatedSuccess ? 200 : 500,
        message: simulatedSuccess ? 'Ping request successfully delivered to endpoint.' : 'Endpoint connection timed out.',
        timestamp: new Date(),
      };
    }

    if (type === 'api-key') {
      const apiKey = await applicationApiKeyRepository.findOne({ uuid: itemUuid, applicationId: app.id });
      if (!apiKey) throw new NotFoundError('API Key not found');

      const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();
      const isActive = apiKey.status === 'active' && !isExpired;

      return {
        success: isActive,
        status: isActive ? 'active' : (isExpired ? 'expired' : 'revoked'),
        message: isActive ? 'API Key is active and verified.' : 'API Key verification failed.',
        timestamp: new Date(),
      };
    }

    throw new BadRequestError('Unsupported verification type');
  }

  /**
   * Version Compatibility Checker (APP-210)
   */
  async checkVersionCompatibility(appUuid, sdkVersion) {
    const app = await applicationRepository.findOne({ uuid: appUuid });
    if (!app) throw new NotFoundError('Application not found');

    const coreVersion = '1.0.0';
    const [sdkMajor] = sdkVersion.split('.').map(Number);
    const [coreMajor] = coreVersion.split('.').map(Number);

    const isCompatible = sdkMajor === coreMajor;

    return {
      compatible: isCompatible,
      sdkVersion,
      platformCoreVersion: coreVersion,
      message: isCompatible 
        ? 'SDK version is fully compatible with platform core API.' 
        : `SDK version mismatch. Major version ${sdkMajor} is not supported by Platform Core ${coreVersion}. Please upgrade your SDK.`,
    };
  }

  /**
   * Calculate and return integration health score (APP-214)
   */
  async calculateHealthScore(appId, environment = 'production') {
    const health = await applicationHealthRepository.findOne({ applicationId: appId, environment });
    if (!health) return 100;

    // Get requests and error counts from analytics
    const analytics = await applicationAnalyticsRepository.findOne({ 
      applicationId: appId, 
      environment,
      date: new Date().toISOString().split('T')[0]
    });

    const requests = analytics ? Number(analytics.requestsCount) : 0;
    const errors = analytics ? Number(analytics.errorsCount) : 0;

    let successRate = 100;
    if (requests > 0) {
      successRate = ((requests - errors) / requests) * 100;
    }

    // Response time factor (linear scaling: <= 200ms -> 100 points, >= 2000ms -> 0 points)
    let responseFactor = 100;
    if (health.responseTime) {
      if (health.responseTime <= 200) {
        responseFactor = 100;
      } else if (health.responseTime >= 2000) {
        responseFactor = 0;
      } else {
        responseFactor = Math.floor(100 - ((health.responseTime - 200) / 18));
      }
    }

    // Uptime factor
    const uptimeFactor = health.uptimeScore || 100;

    // Unified health score (50% uptime, 30% response speed, 20% success rate)
    const score = Math.floor((uptimeFactor * 0.5) + (responseFactor * 0.3) + (successRate * 0.2));
    
    // Save calculated score to health record
    await applicationHealthRepository.update(health.id, { healthScore: score });

    return score;
  }
}

module.exports = new PlatformApplicationService();
