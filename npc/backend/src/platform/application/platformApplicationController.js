'use strict';

const platformApplicationService = require('./platformApplication.service');
const applicationRepository = require('./application.repository');
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

const ApiResponse = require('../../shared/response/ApiResponse');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../../shared/errors/AppError');
const crypto = require('crypto');

// 1. GET /
const listApplications = asyncHandler(async (req, res) => {
  const apps = await applicationRepository.findMany({ isDeleted: false });
  // Add calculated health score dynamically
  const enrichedApps = [];
  for (const app of apps) {
    const healthScore = await platformApplicationService.calculateHealthScore(app.id);
    enrichedApps.push({
      ...app.toJSON(),
      healthScore,
    });
  }
  return ApiResponse.success(res, enrichedApps, 'Applications retrieved successfully');
});

// 2. POST /
const createApplication = asyncHandler(async (req, res) => {
  const adminUserId = req.user.id;
  const app = await platformApplicationService.onboardApplication(req.body, adminUserId);
  return ApiResponse.success(res, app, 'Application onboarded successfully');
});

// 3. GET /:uuid
const getApplicationByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const healthScore = await platformApplicationService.calculateHealthScore(app.id);
  const result = {
    ...app.toJSON(),
    healthScore,
  };

  return ApiResponse.success(res, result, 'Application details retrieved successfully');
});

// 4. PUT /:uuid
const updateApplicationByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const adminUserId = req.user.id;
  const app = await platformApplicationService.updateApplication(uuid, req.body, adminUserId);
  return ApiResponse.success(res, app, 'Application details updated successfully');
});

// 5. DELETE /:uuid
const deleteApplicationByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const adminUserId = req.user.id;
  await platformApplicationService.deleteApplication(uuid, adminUserId);
  return ApiResponse.success(res, null, 'Application deleted successfully');
});

// 6. POST /:uuid/api-keys
const createApiKey = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { name, environment, expiresAt, scopes } = req.body;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const rawKey = `nex_live_${crypto.randomBytes(16).toString('hex')}`;
  const rawSecret = crypto.randomBytes(32).toString('hex');

  const apiKey = await applicationApiKeyRepository.create({
    applicationId: app.id,
    environment: environment || 'production',
    key: rawKey,
    secret: platformApplicationService.encryptSecret(rawSecret),
    name: name || 'API Key',
    scopes: scopes ? JSON.stringify(scopes) : '[]',
    status: 'active',
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });

  return ApiResponse.success(res, {
    uuid: apiKey.uuid,
    name: apiKey.name,
    environment: apiKey.environment,
    key: rawKey,
    secret: rawSecret, // Return plain secret ONLY ONCE on creation
    scopes: scopes || [],
    status: apiKey.status,
    expiresAt: apiKey.expiresAt,
  }, 'API Key generated successfully');
});

// 7. GET /:uuid/api-keys
const listApiKeys = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const keys = await applicationApiKeyRepository.findMany({ applicationId: app.id, isDeleted: false });
  const result = keys.map(k => ({
    uuid: k.uuid,
    name: k.name,
    environment: k.environment,
    key: `${k.key.substring(0, 12)}...`, // Mask key for security
    scopes: k.scopes ? JSON.parse(k.scopes) : [],
    status: k.status,
    expiresAt: k.expiresAt,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
  }));

  return ApiResponse.success(res, result, 'API Keys retrieved successfully');
});

// 8. DELETE /:uuid/api-keys/:keyUuid
const revokeApiKey = asyncHandler(async (req, res) => {
  const { uuid, keyUuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const key = await applicationApiKeyRepository.findOne({ uuid: keyUuid, applicationId: app.id });
  if (!key) throw new NotFoundError('API Key not found');

  await applicationApiKeyRepository.update(key.id, { status: 'revoked', isDeleted: true });
  return ApiResponse.success(res, null, 'API Key revoked successfully');
});

// 9. POST /:uuid/sdk
const generateSdkCredentials = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const clientId = `sdk_cli_${crypto.randomBytes(12).toString('hex')}`;
  const clientSecret = crypto.randomBytes(32).toString('hex');

  const sdk = await applicationSdkCredentialRepository.create({
    applicationId: app.id,
    clientId,
    clientSecret: platformApplicationService.encryptSecret(clientSecret),
    status: 'active',
  });

  return ApiResponse.success(res, {
    uuid: sdk.uuid,
    clientId,
    clientSecret,
    status: sdk.status,
  }, 'SDK credentials created successfully');
});

// 10. GET /:uuid/sdk
const getSdkCredentials = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const sdks = await applicationSdkCredentialRepository.findMany({ applicationId: app.id, isDeleted: false });
  const result = sdks.map(s => ({
    uuid: s.uuid,
    clientId: s.clientId,
    status: s.status,
    createdAt: s.createdAt,
  }));

  return ApiResponse.success(res, result, 'SDK credentials retrieved successfully');
});

// 11. POST /:uuid/webhooks
const createWebhook = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { url, environment, events, retryPolicy } = req.body;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
  const signingKey = crypto.randomBytes(24).toString('hex');

  const webhook = await applicationWebhookRepository.create({
    applicationId: app.id,
    environment: environment || 'production',
    url,
    secret: platformApplicationService.encryptSecret(secret),
    signingKey,
    events: events ? JSON.stringify(events) : '[]',
    retryPolicy: retryPolicy ? JSON.stringify(retryPolicy) : '{}',
    status: 'active',
  });

  return ApiResponse.success(res, {
    uuid: webhook.uuid,
    environment: webhook.environment,
    url: webhook.url,
    secret, // Return secret ONCE
    signingKey,
    events: events || [],
    status: webhook.status,
  }, 'Webhook endpoint registered successfully');
});

// 12. GET /:uuid/webhooks
const listWebhooks = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const webhooks = await applicationWebhookRepository.findMany({ applicationId: app.id, isDeleted: false });
  const result = webhooks.map(w => ({
    uuid: w.uuid,
    environment: w.environment,
    url: w.url,
    events: w.events ? JSON.parse(w.events) : [],
    status: w.status,
    createdAt: w.createdAt,
  }));

  return ApiResponse.success(res, result, 'Webhook endpoints retrieved successfully');
});

// 13. POST /:uuid/oauth
const createOauthClient = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { redirectUrls, scopes } = req.body;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const clientId = `oauth_cli_${crypto.randomBytes(12).toString('hex')}`;
  const clientSecret = crypto.randomBytes(32).toString('hex');

  const oauth = await applicationOauthClientRepository.create({
    applicationId: app.id,
    clientId,
    clientSecret: platformApplicationService.encryptSecret(clientSecret),
    redirectUrls: redirectUrls ? JSON.stringify(redirectUrls) : '[]',
    scopes: scopes ? JSON.stringify(scopes) : '[]',
    status: 'active',
  });

  return ApiResponse.success(res, {
    uuid: oauth.uuid,
    clientId,
    clientSecret,
    redirectUrls: redirectUrls || [],
    scopes: scopes || [],
    status: oauth.status,
  }, 'OAuth client registered successfully');
});

// 14. GET /:uuid/oauth
const listOauthClients = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const oauths = await applicationOauthClientRepository.findMany({ applicationId: app.id, isDeleted: false });
  const result = oauths.map(o => ({
    uuid: o.uuid,
    clientId: o.clientId,
    redirectUrls: o.redirectUrls ? JSON.parse(o.redirectUrls) : [],
    scopes: o.scopes ? JSON.parse(o.scopes) : [],
    status: o.status,
    createdAt: o.createdAt,
  }));

  return ApiResponse.success(res, result, 'OAuth Clients retrieved successfully');
});

// 15. GET /:uuid/feature-flags
const listFeatureFlags = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const flags = await applicationFeatureFlagRepository.findMany({ applicationId: app.id, isDeleted: false });
  return ApiResponse.success(res, flags, 'Feature flags retrieved successfully');
});

// 16. PUT /:uuid/feature-flags
const updateFeatureFlag = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { key, value, description } = req.body;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  let flag = await applicationFeatureFlagRepository.findOne({ applicationId: app.id, key, isDeleted: false });
  if (flag) {
    await applicationFeatureFlagRepository.update(flag.id, { value, description });
  } else {
    flag = await applicationFeatureFlagRepository.create({
      applicationId: app.id,
      key,
      value,
      description,
    });
  }

  return ApiResponse.success(res, flag, 'Feature flag updated successfully');
});

// 17. GET /:uuid/analytics (APP-205, APP-212)
const getAnalytics = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { environment } = req.query;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const analytics = await applicationAnalyticsRepository.findMany({
    applicationId: app.id,
    environment: environment || 'production',
  }, {
    limit: 30,
    order: [['date', 'DESC']],
  });

  return ApiResponse.success(res, analytics, 'Application analytics retrieved successfully');
});

// 18. GET /:uuid/health (APP-204, APP-214)
const getHealth = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const healthRecords = await applicationHealthRepository.findMany({ applicationId: app.id });
  return ApiResponse.success(res, healthRecords, 'Application health metrics retrieved successfully');
});

// 19. GET /:uuid/logs (APP-205)
const getLogs = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { environment, limit } = req.query;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const logs = await applicationLogRepository.findMany({
    applicationId: app.id,
    environment: environment || 'production',
  }, {
    limit: limit ? Number(limit) : 50,
    order: [['createdAt', 'DESC']],
  });

  return ApiResponse.success(res, logs, 'Application logs retrieved successfully');
});

// 20. GET /:uuid/rate-limits
const getRateLimits = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const limits = await applicationRateLimitRepository.findMany({ applicationId: app.id, isDeleted: false });
  return ApiResponse.success(res, limits, 'Rate limits retrieved successfully');
});

// 21. PUT /:uuid/rate-limits
const updateRateLimits = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { environment, limit, burstLimit, period } = req.body;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  let limitRecord = await applicationRateLimitRepository.findOne({ applicationId: app.id, environment, isDeleted: false });
  if (limitRecord) {
    await applicationRateLimitRepository.update(limitRecord.id, { limit, burstLimit, period });
  } else {
    limitRecord = await applicationRateLimitRepository.create({
      applicationId: app.id,
      environment: environment || 'production',
      limit: limit || 1000,
      burstLimit: burstLimit || 60,
      period: period || 'day',
    });
  }

  return ApiResponse.success(res, limitRecord, 'Rate limit configurations updated successfully');
});

// 22. GET /:uuid/domains
const getDomains = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const domains = await applicationDomainRepository.findMany({ applicationId: app.id, isDeleted: false });
  return ApiResponse.success(res, domains, 'Registered domains retrieved successfully');
});

// 23. POST /:uuid/domains (APP-207)
const createDomain = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { domain, environment } = req.body;
  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const verificationToken = `dns_verify_${crypto.randomBytes(16).toString('hex')}`;
  const domainRecord = await applicationDomainRepository.create({
    applicationId: app.id,
    domain,
    environment: environment || 'production',
    status: 'pending',
    verificationToken,
  });

  return ApiResponse.success(res, domainRecord, 'Domain registered and pending verification');
});

// 24. GET /capabilities (APP-201)
const getCapabilities = asyncHandler(async (req, res) => {
  const capabilities = [
    { name: 'auth', displayName: 'Identity & Authentication', description: 'Enable multi-tenant JWT and session authentication.' },
    { name: 'billing', displayName: 'Billing Quotas', description: 'Track SaaS API consumption quotas.' },
    { name: 'webhooks', displayName: 'Webhook Dispatcher', description: 'Forward real-time events to external servers.' },
    { name: 'oauth', displayName: 'OAuth Client Credentials', description: 'Allow third-party app authorization integrations.' },
  ];
  return ApiResponse.success(res, capabilities, 'Capabilities dictionary retrieved successfully');
});

// Helper: Rotate secret endpoint
const rotateSecretEndpoint = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { type, itemUuid } = req.body;
  const adminUserId = req.user.id;
  const result = await platformApplicationService.rotateSecret(uuid, type, itemUuid, adminUserId);
  return ApiResponse.success(res, result, 'Secret rotated successfully');
});

// Helper: Verify connection endpoint
const verifyConnectionEndpoint = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { type, itemUuid } = req.body;
  const result = await platformApplicationService.verifyConnection(uuid, type, itemUuid);
  return ApiResponse.success(res, result, 'Connection verified successfully');
});

// Telemetry Log Ingestion (APP-205)
const ingestLogs = asyncHandler(async (req, res) => {
  const app = req.npcApp;
  const { environment, level, message, meta } = req.body;

  const logRecord = await applicationLogRepository.create({
    applicationId: app.id,
    environment: environment || 'production',
    level: level || 'info',
    message: message || 'Log entry',
    meta: meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : null,
  });

  return ApiResponse.success(res, logRecord, 'Telemetry log ingested successfully');
});

// Generic operations and provisioning endpoints
const provisionApplicationTenant = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { tenantUuid, ownerUserUuid } = req.body;

  const tenantRepository = require('../tenant/tenant.repository');
  const userRepository = require('../identity/user.repository');
  const businessRepository = require('../business/business.repository');
  const branchRepository = require('../branch/branch.repository');
  const operationJobRepository = require('./operationJob.repository');

  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const tenant = await tenantRepository.findOne({ uuid: tenantUuid, isDeleted: false });
  if (!tenant) throw new NotFoundError('Tenant not found');

  const owner = await userRepository.findOne({ uuid: ownerUserUuid, isDeleted: false });
  if (!owner) throw new NotFoundError('Owner user not found');

  const business = await businessRepository.findOne({ tenantId: tenant.id, isDeleted: false });
  const branch = await branchRepository.findOne({ tenantId: tenant.id, isDeleted: false });

  const payload = {
    correlationId: crypto.randomUUID(),
    tenantName: tenant.name,
    slug: tenant.slug,
    ownerName: owner.name,
    ownerEmail: owner.email,
    ownerPassword: 'TemporaryPassword@123',
    ownerPhone: owner.phone || '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    locale: 'en-US'
  };

  const job = await operationJobRepository.create({
    applicationId: app.id,
    tenantId: tenant.id,
    operationType: 'provision',
    status: 'pending',
    payload: JSON.stringify(payload),
    maxRetries: 5
  });

  // Trigger OperationJobEngine immediately to run the job
  const operationJobEngine = require('./operationJobEngine');
  setImmediate(() => {
    operationJobEngine.processJobs().catch(err => {
      console.error('[NPC Control Plane] Error running operation job engine after queueing:', err);
    });
  });

  return ApiResponse.success(res, {
    jobUuid: job.uuid,
    status: job.status,
    message: 'Provisioning job created and queued successfully'
  }, 'Provisioning job initiated');
});

const syncApplicationTenant = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { tenantUuid } = req.body;

  const tenantRepository = require('../tenant/tenant.repository');
  const operationJobRepository = require('./operationJob.repository');

  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const tenant = await tenantRepository.findOne({ uuid: tenantUuid, isDeleted: false });
  if (!tenant) throw new NotFoundError('Tenant not found');

  const payload = {
    correlationId: crypto.randomUUID(),
    tenantUuid: tenant.uuid,
    name: tenant.name,
    status: tenant.status
  };

  const job = await operationJobRepository.create({
    applicationId: app.id,
    tenantId: tenant.id,
    operationType: 'sync',
    status: 'pending',
    payload: JSON.stringify(payload),
    maxRetries: 5
  });

  // Trigger OperationJobEngine immediately to run the job
  const operationJobEngine = require('./operationJobEngine');
  setImmediate(() => {
    operationJobEngine.processJobs().catch(err => {
      console.error('[NPC Control Plane] Error running operation job engine after queueing:', err);
    });
  });

  return ApiResponse.success(res, {
    jobUuid: job.uuid,
    status: job.status,
    message: 'Synchronization job created and queued successfully'
  }, 'Synchronization job initiated');
});

const getOperationJobStatus = asyncHandler(async (req, res) => {
  const { jobUuid } = req.params;
  const operationJobRepository = require('./operationJob.repository');

  const job = await operationJobRepository.findOne({ uuid: jobUuid });
  if (!job) throw new NotFoundError('Operation job not found');

  return ApiResponse.success(res, {
    uuid: job.uuid,
    operationType: job.operationType,
    status: job.status,
    retryCount: job.retryCount,
    maxRetries: job.maxRetries,
    lastError: job.lastError,
    completedAt: job.completedAt
  }, 'Operation job status retrieved successfully');
});

const listOperationJobs = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const operationJobRepository = require('./operationJob.repository');

  const app = await applicationRepository.findOne({ uuid, isDeleted: false });
  if (!app) throw new NotFoundError('Application not found');

  const jobs = await operationJobRepository.model.findAll({
    where: { applicationId: app.id },
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  return ApiResponse.success(res, jobs, 'Operation jobs retrieved successfully');
});

const retryOperationJob = asyncHandler(async (req, res) => {
  const { jobUuid } = req.params;
  const operationJobRepository = require('./operationJob.repository');

  const job = await operationJobRepository.findOne({ uuid: jobUuid });
  if (!job) throw new NotFoundError('Operation job not found');

  if (job.status !== 'failed' && job.status !== 'dead_letter') {
    throw new BadRequestError('Only failed or dead letter queue jobs can be retried');
  }

  await job.update({
    status: 'pending',
    retryCount: 0,
    nextAttemptAt: new Date(),
    lastError: null
  });

  // Trigger OperationJobEngine immediately to run the job
  const operationJobEngine = require('./operationJobEngine');
  setImmediate(() => {
    operationJobEngine.processJobs().catch(err => {
      console.error('[NPC Control Plane] Error running operation job engine after queueing:', err);
    });
  });

  return ApiResponse.success(res, {
    uuid: job.uuid,
    status: job.status,
    message: 'Job status reset to pending and rescheduled'
  }, 'Job queued for retry');
});

module.exports = {
  listApplications,
  createApplication,
  getApplicationByUuid,
  updateApplicationByUuid,
  deleteApplicationByUuid,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  generateSdkCredentials,
  getSdkCredentials,
  createWebhook,
  listWebhooks,
  createOauthClient,
  listOauthClients,
  listFeatureFlags,
  updateFeatureFlag,
  getAnalytics,
  getHealth,
  getLogs,
  getRateLimits,
  updateRateLimits,
  getDomains,
  createDomain,
  getCapabilities,
  rotateSecretEndpoint,
  verifyConnectionEndpoint,
  ingestLogs,
  provisionApplicationTenant,
  syncApplicationTenant,
  getOperationJobStatus,
  listOperationJobs,
  retryOperationJob,
};

