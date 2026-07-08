'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_business_secret_key_3344';
process.env.SINGLE_TENANT_MODE = 'false';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' NPC: Business Management API Integration Tests');
console.log('====================================================');

const loadModule = (name, relativePath) => {
  const absPath = path.join(workspaceBackend, relativePath);
  try {
    return require(absPath);
  } catch (err) {
    console.error(`[TEST_ERR] Failed to load module: ${name} (Path: ${absPath})`);
    console.error(err);
    process.exit(1);
  }
};

const app = loadModule('Express App', 'src/app');
const sequelize = loadModule('Sequelize instance', 'src/config/database');
const migrationV1 = loadModule('Migration V1', 'src/shared/database/migrations/20260705000000-create-platform-tables');
const migrationV2 = loadModule('Migration V2', 'src/shared/database/migrations/20260705010000-create-identity-v2-tables');
const migrationV3 = loadModule('Migration V3', 'src/shared/database/migrations/20260705020000-create-tenant-v2-fields');
const migrationV4 = loadModule('Migration V4', 'src/shared/database/migrations/20260706000000-create-business-v2-tables');
const seeder = loadModule('Platform Seeder', 'src/shared/database/seeders/20260705000000-seed-platform-data');

// Models
const Tenant = loadModule('Tenant Model', 'src/platform/tenant/tenant.model');
const Business = loadModule('Business Model', 'src/platform/business/business.model');
const BusinessSettings = loadModule('BusinessSettings Model', 'src/platform/business/businessSettings.model');
const BusinessBranding = loadModule('BusinessBranding Model', 'src/platform/business/businessBranding.model');
const BusinessContact = loadModule('BusinessContact Model', 'src/platform/business/businessContact.model');
const BusinessAddress = loadModule('BusinessAddress Model', 'src/platform/business/businessAddress.model');
const BusinessPreference = loadModule('BusinessPreference Model', 'src/platform/business/businessPreference.model');
const UserMembership = loadModule('UserMembership Model', 'src/platform/identity/userMembership.model');
const PlatformAudit = loadModule('PlatformAudit Model', 'src/platform/audit/platformAudit.model');
const Outbox = loadModule('Outbox Model', 'src/shared/events/outbox.model');
const Subscription = loadModule('Subscription Model', 'src/platform/subscription/subscription.model');
const License = loadModule('License Model', 'src/platform/license/license.model');
const { User } = loadModule('User Model', 'src/models');

// Services
const identityService = loadModule('IdentityService', 'src/platform/identity/identity.service');
const platformBusinessService = loadModule('PlatformBusinessService', 'src/platform/business/platformBusiness.service');

const makeRequest = (port, path, method = 'GET', headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, rawBody: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  const queryInterface = sequelize.getQueryInterface();
  let server = null;
  let port = null;

  try {
    // 0. Database Setup
    console.log('\n[0] Rebuilding database tables with Migrations (V1 to V4)...');
    try {
      await migrationV1.up(queryInterface, sequelize.Sequelize);
      await migrationV2.up(queryInterface, sequelize.Sequelize);
      await migrationV3.up(queryInterface, sequelize.Sequelize);
      await migrationV4.up(queryInterface, sequelize.Sequelize);
      await seeder.up(queryInterface, sequelize.Sequelize);
      console.log('-> Migrations & seeders execution: PASSED');
    } catch (err) {
      console.error('[DATABASE_SETUP_ERR] Failed to setup database schemas:', err);
      throw err;
    }

    // Spin up test server
    port = 5000 + Math.floor(Math.random() * 10000);
    server = app.listen(port);
    console.log(`-> Local HTTP Test Server running on port ${port}`);

    // Seed test users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Admin@123', salt);

    // Clean and insert users
    const { Op } = sequelize.Sequelize;
    await User.destroy({ where: { email: { [Op.in]: ['super@mednex.com', 'pharma@mednex.com', 'owner@alice.com'] } } });

    const superAdminUser = await User.create({
      id: 'super-admin-uuid-1',
      name: 'Super Admin',
      email: 'super@mednex.com',
      password: passwordHash,
      role: 'super_admin',
      isActive: true,
    });

    const pharmacistUser = await User.create({
      id: 'pharma-uuid-1',
      name: 'Pharmacist User',
      email: 'pharma@mednex.com',
      password: passwordHash,
      role: 'pharmacist',
      isActive: true,
    });

    // Create Tenant
    const tenant = await Tenant.create({
      name: 'Alice Enterprises',
      slug: 'alice-enterprises',
      email: 'owner@alice.com',
      subdomain: 'alice',
      status: 'active',
      isActive: true,
    });

    // Create active subscription
    await Subscription.create({
      tenantId: tenant.id,
      planId: 'Premium',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Create license
    await License.create({
      tenantId: tenant.id,
      licenseKey: 'lic_alice_999',
      licenseType: 'Premium',
      maxUsers: 25,
      maxBranches: 5,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Generate JWTs directly using jwt.sign
    const jwt = require('jsonwebtoken');
    const superToken = jwt.sign({ id: superAdminUser.id, email: superAdminUser.email, role: 'super_admin' }, process.env.JWT_SECRET);
    const pharmacistToken = jwt.sign({ id: pharmacistUser.id, email: pharmacistUser.email, role: 'pharmacist' }, process.env.JWT_SECRET);

    const superHeaders = { Authorization: `Bearer ${superToken}` };
    const pharmacistHeaders = { Authorization: `Bearer ${pharmacistToken}` };

    console.log('-> Users & membership data seeding: PASSED');

    // ─── [1] Test Capabilities Endpoint ───────────────────────────────────────
    console.log('\n[1] Testing Capabilities Metadata Contract Endpoint...');
    const resCap = await makeRequest(port, '/api/v1/platform/capabilities', 'GET', superHeaders);
    assert.strictEqual(resCap.status, 200, 'Capabilities must succeed');
    assert.strictEqual(resCap.body.data.platformName, 'Nex Platform Core (NPC)');
    assert.ok(resCap.body.data.permissionsCatalog.super_admin, 'Permissions catalog exists');
    console.log('-> Capabilities Contract endpoint: PASSED');

    // ─── [2] Test RBAC Authorization ──────────────────────────────────────────
    console.log('\n[2] Testing RBAC authorization for Business Management...');
    const listPharma = await makeRequest(port, '/api/v1/platform/businesses', 'GET', pharmacistHeaders);
    assert.strictEqual(listPharma.status, 403, 'Pharmacist must be blocked with 403 Forbidden');

    const listSuper = await makeRequest(port, '/api/v1/platform/businesses', 'GET', superHeaders);
    assert.strictEqual(listSuper.status, 200, 'Super admin must fetch list successfully');
    console.log('-> RBAC restrictions: PASSED');

    // ─── [3] Test Business Provisioning & Nested Models ───────────────────────
    console.log('\n[3] Testing Business Provisioning, CorrelationId & Outbox...');
    
    const idempotencyKey = 'idem-key-' + crypto.randomUUID();
    const newBusinessPayload = {
      tenantUuid: tenant.uuid,
      name: 'MediNex Healthcare Store',
      legalName: 'MediNex Healthcare Ltd',
      displayName: 'MediNex Central Store',
      businessCode: 'MNX-CTR-01',
      slug: 'medinex-healthcare-store',
      email: 'central@medinex.com',
      phone: '+919988776655',
      industry: 'Healthcare',
      businessType: 'Retail Pharmacy',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      locale: 'en-US',
      language: 'en',
      website: 'www.medinex.com',
      taxNumber: 'GSTIN29ABC1234F',
      registrationNumber: 'REG-9988-77',
      settings: {
        invoicePrefix: 'MNX',
        receiptPrefix: 'REC',
        dateFormat: 'DD/MM/YYYY',
      },
      branding: {
        primaryColor: '#EF4444',
        secondaryColor: '#10B981',
        theme: 'dark',
      },
      address: {
        addressLine1: '456 Main Road',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560001',
      },
    };

    const corrHeaders = {
      ...superHeaders,
      'x-correlation-id': 'corr-id-998877',
      'idempotency-key': idempotencyKey,
    };

    const resCreate = await makeRequest(port, '/api/v1/platform/businesses', 'POST', corrHeaders, newBusinessPayload);
    assert.strictEqual(resCreate.status, 201, 'Creation should succeed');
    assert.strictEqual(resCreate.headers['x-correlation-id'], 'corr-id-998877', 'Correlation ID header propagated');
    assert.strictEqual(resCreate.body.meta.correlationId, 'corr-id-998877', 'Correlation ID inside response meta propagated');
    assert.ok(resCreate.body.data.uuid, 'Business uuid returned');

    const businessUuid = resCreate.body.data.uuid;

    // Verify settings created in DB
    const dbSettings = await BusinessSettings.findAll({ where: { businessId: resCreate.body.data.id } });
    const invoicePrefixSetting = dbSettings.find(s => s.key === 'billing.prefix.invoice');
    assert.strictEqual(invoicePrefixSetting.value, 'MNX', 'Key-value config registry setting created');

    // Verify outbox created
    const pendingOutbox = await Outbox.findOne({ where: { eventName: 'BusinessCreated' } });
    assert.ok(pendingOutbox, 'Domain event recorded inside transactional outbox table');
    const parsedPayload = typeof pendingOutbox.payload === 'string' ? JSON.parse(pendingOutbox.payload).payload : pendingOutbox.payload.payload;
    assert.strictEqual(parsedPayload.businessUuid, businessUuid, 'Outbox payload matches');

    console.log('-> Business provisioning & outbox records: PASSED');

    // ─── [4] Test Idempotency Support ─────────────────────────────────────────
    console.log('\n[4] Testing Idempotency-Key duplicate replay protection...');
    // Replay identical POST
    const resReplay = await makeRequest(port, '/api/v1/platform/businesses', 'POST', corrHeaders, newBusinessPayload);
    assert.strictEqual(resReplay.status, 201, 'Replayed request gets cached success response');
    assert.strictEqual(resReplay.body.data.uuid, businessUuid, 'Replayed uuid matches exactly');
    console.log('-> Idempotency Replay Protection: PASSED');

    // ─── [5] Test Limit Enforcements & Policy Engine ──────────────────────────
    console.log('\n[5] Testing Subscription Limit Policy Enforcement...');
    // Set max limit on license to 1
    const aliceLicense = await License.findOne({ where: { tenantId: tenant.id } });
    // Simulate Free license with limit of 1 business (we already created 1)
    aliceLicense.licenseType = 'Standard';
    await aliceLicense.save();

    const resOverlimit = await makeRequest(port, '/api/v1/platform/businesses', 'POST', superHeaders, {
      ...newBusinessPayload,
      name: 'MediNex Healthcare Store 2',
      slug: 'medinex-healthcare-store-2',
      email: 'central2@medinex.com',
    });
    assert.strictEqual(resOverlimit.status, 403, 'Should block business creation when limits are exceeded');
    assert.strictEqual(resOverlimit.body.errorCode, 'LIMIT_EXCEEDED', 'Returns LIMIT_EXCEEDED error code');
    console.log('-> Subscription Limit Policy: PASSED');

    // Restore license limit for updates
    aliceLicense.licenseType = 'Premium';
    await aliceLicense.save();

    // ─── [6] Test Optimistic Locking Conflicts ───────────────────────────────
    console.log('\n[6] Testing Optimistic Locking concurrent conflicts...');
    const businessToLock = await Business.findOne({ where: { uuid: businessUuid } });
    
    // Simulate updating with stale version
    const tUpdate1 = await platformBusinessService.updateBusiness(businessUuid, { name: 'Superstore Updated 1' });
    
    try {
      // Simulate another process updating using the old stale instance
      await platformBusinessService.updateBusiness(businessUuid, {
        name: 'Superstore Updated 2',
        version: businessToLock.version // Passing stale version
      });
      assert.fail('Should fail due to optimistic locking conflict');
    } catch (err) {
      assert.strictEqual(err.errorCode, 'CONCURRENT_OVERWRITE_CONFLICT', 'Throws concurrent overwrite conflict');
    }
    console.log('-> Optimistic locking conflict validation: PASSED');

    // ─── [7] Test Health & Summary Generic Endpoints ─────────────────────────
    console.log('\n[7] Testing Platform-Generic Health and Summary Diagnostics...');
    const resHealth = await makeRequest(port, `/api/v1/platform/businesses/${businessUuid}/health`, 'GET', superHeaders);
    assert.strictEqual(resHealth.status, 200, 'Health check succeeds');
    assert.strictEqual(resHealth.body.data.metrics.totalUsers, 1, 'Generic users count matched');
    assert.strictEqual(resHealth.body.data.medicines, undefined, 'No pharmacy leaks in health diagnostics');

    const resSummary = await makeRequest(port, `/api/v1/platform/businesses/${businessUuid}/summary`, 'GET', superHeaders);
    assert.strictEqual(resSummary.status, 200, 'Summary check succeeds');
    assert.strictEqual(resSummary.body.data.medicines, undefined, 'No pharmacy leaks in summary analytics');
    console.log('-> Platform-Generic Health & Summary: PASSED');

    // ─── [8] Test Lifecycle Status Transition Machine ────────────────────────
    console.log('\n[8] Testing Lifecycle Manager State Transitions...');
    // Suspend
    const resSuspend = await makeRequest(port, `/api/v1/platform/businesses/${businessUuid}/suspend`, 'POST', superHeaders);
    assert.strictEqual(resSuspend.status, 200);
    assert.strictEqual(resSuspend.body.data.status, 'suspended');

    // Attempting invalid transition (suspended -> provisioning) should fail
    try {
      const LifecycleManager = loadModule('LifecycleManager', 'src/shared/core/LifecycleManager');
      LifecycleManager.validateTransition('suspended', 'provisioning');
      assert.fail('Should fail to validate invalid transition');
    } catch (err) {
      assert.strictEqual(err.errorCode, 'INVALID_STATE_TRANSITION', 'Invalid transition blocked');
    }
    console.log('-> Lifecycle state transition checks: PASSED');

    console.log('\n====================================================');
    console.log(' ALL BUSINESS ENGINE INTEGRATION TESTS: PASSED (100%)');
    console.log('====================================================');

    // Teardown
    console.log('\n[Teardown] Tearing down integration test tables...');
    server.close();
    await migrationV4.down(queryInterface, sequelize.Sequelize);
    await migrationV3.down(queryInterface, sequelize.Sequelize);
    await migrationV2.down(queryInterface, sequelize.Sequelize);
    await migrationV1.down(queryInterface, sequelize.Sequelize);
    console.log('-> Database rolled back successfully');
    process.exit(0);

  } catch (err) {
    console.error('\n[FAIL] Business Management API integration tests failed:');
    console.error(err);
    if (server) {
      server.close();
    }
    try {
      await migrationV4.down(queryInterface, sequelize.Sequelize);
      await migrationV3.down(queryInterface, sequelize.Sequelize);
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
    } catch {}
    process.exit(1);
  }
};

runTests();
