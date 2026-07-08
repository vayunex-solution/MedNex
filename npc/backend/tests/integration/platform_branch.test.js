'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_branch_secret_key_8899';
process.env.SINGLE_TENANT_MODE = 'false';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' NPC: Branch Management API Integration Tests');
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
const migrationV5 = loadModule('Migration V5', 'src/shared/database/migrations/20260707000000-create-branch-v2-tables');
const seeder = loadModule('Platform Seeder', 'src/shared/database/seeders/20260705000000-seed-platform-data');

// Models
const Tenant = loadModule('Tenant Model', 'src/platform/tenant/tenant.model');
const Business = loadModule('Business Model', 'src/platform/business/business.model');
const Branch = loadModule('Branch Model', 'src/platform/branch/branch.model');
const BranchSettings = loadModule('BranchSettings Model', 'src/platform/branch/branchSettings.model');
const BranchBranding = loadModule('BranchBranding Model', 'src/platform/branch/branchBranding.model');
const BranchContact = loadModule('BranchContact Model', 'src/platform/branch/branchContact.model');
const BranchAddress = loadModule('BranchAddress Model', 'src/platform/branch/branchAddress.model');
const BranchPreference = loadModule('BranchPreference Model', 'src/platform/branch/branchPreference.model');
const UserMembership = loadModule('UserMembership Model', 'src/platform/identity/userMembership.model');
const PlatformAudit = loadModule('PlatformAudit Model', 'src/platform/audit/platformAudit.model');
const Outbox = loadModule('Outbox Model', 'src/shared/events/outbox.model');
const Subscription = loadModule('Subscription Model', 'src/platform/subscription/subscription.model');
const License = loadModule('License Model', 'src/platform/license/license.model');
const { User } = loadModule('User Model', 'src/models');

// Services
const platformBranchService = loadModule('PlatformBranchService', 'src/platform/branch/platformBranch.service');

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
    console.log('\n[0] Rebuilding database tables with Migrations (V1 to V5)...');
    try {
      const tablesToClean = [
        'plat_branch_memberships', 'plat_branch_metadata', 'plat_branch_preferences',
        'plat_branch_addresses', 'plat_branch_contacts', 'plat_branch_branding',
        'plat_branch_settings', 'plat_branches',
        'plat_business_memberships', 'plat_business_metadata', 'plat_business_preferences',
        'plat_business_addresses', 'plat_business_contacts', 'plat_business_branding',
        'plat_business_settings', 'plat_businesses',
        'plat_idempotency_keys', 'plat_outbox',
        'plat_api_key_scopes', 'plat_login_rate_limits', 'plat_user_memberships',
        'plat_platform_settings', 'plat_tenant_settings', 'plat_user_sessions',
        'plat_refresh_tokens', 'plat_tenants',
        'plat_api_keys', 'plat_role_permissions', 'plat_permissions', 'plat_roles',
        'plat_subscriptions', 'plat_licenses'
      ];
      for (const t of tablesToClean) {
        try {
          await queryInterface.dropTable(t, { cascade: true });
        } catch (e) {
          // Ignore if table does not exist
        }
      }

      await migrationV1.up(queryInterface, sequelize.Sequelize);
      await migrationV2.up(queryInterface, sequelize.Sequelize);
      await migrationV3.up(queryInterface, sequelize.Sequelize);
      await migrationV4.up(queryInterface, sequelize.Sequelize);
      await migrationV5.up(queryInterface, sequelize.Sequelize);
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
    const license = await License.create({
      tenantId: tenant.id,
      licenseKey: 'lic_alice_999',
      licenseType: 'Premium',
      maxUsers: 25,
      maxBranches: 2, // Allow up to 2 branches
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Create default Business
    const business = await Business.create({
      tenantId: tenant.id,
      name: 'Alice Healthcare',
      slug: 'alice-healthcare',
      email: 'hq@alice.com',
      status: 'active',
      isActive: true,
      version: 1,
    });

    // Generate JWTs directly
    const jwt = require('jsonwebtoken');
    const superToken = jwt.sign({ id: superAdminUser.id, email: superAdminUser.email, role: 'super_admin' }, process.env.JWT_SECRET);
    const pharmacistToken = jwt.sign({ id: pharmacistUser.id, email: pharmacistUser.email, role: 'pharmacist' }, process.env.JWT_SECRET);

    const superHeaders = { Authorization: `Bearer ${superToken}` };
    const pharmacistHeaders = { Authorization: `Bearer ${pharmacistToken}` };

    console.log('-> Users, Tenant, Business & License data seeding: PASSED');

    // ─── [1] Test Capabilities Endpoint ───────────────────────────────────────
    console.log('\n[1] Testing Capabilities Metadata Contract Endpoint...');
    const resCap = await makeRequest(port, '/api/v1/platform/capabilities', 'GET', superHeaders);
    assert.strictEqual(resCap.status, 200, 'Capabilities must succeed');
    assert.strictEqual(resCap.body.data.platformName, 'Nex Platform Core (NPC)');
    assert.ok(resCap.body.data.permissionsCatalog.super_admin, 'Permissions catalog exists');
    console.log('-> Capabilities Contract endpoint: PASSED');

    // ─── [2] Test RBAC Authorization ──────────────────────────────────────────
    console.log('\n[2] Testing RBAC authorization for Branch Management...');
    const listPharma = await makeRequest(port, '/api/v1/platform/branches', 'GET', pharmacistHeaders);
    assert.strictEqual(listPharma.status, 403, 'Pharmacist must be blocked with 403 Forbidden');

    const listSuper = await makeRequest(port, '/api/v1/platform/branches', 'GET', superHeaders);
    assert.strictEqual(listSuper.status, 200, 'Super admin must fetch list successfully');
    console.log('-> RBAC restrictions: PASSED');

    // ─── [3] Test Branch Provisioning, CorrelationId & Outbox ─────────────────
    console.log('\n[3] Testing Branch Provisioning, CorrelationId & Outbox...');
    const corrId = 'corr-id-778899';
    const idemKey = 'idem-key-' + crypto.randomUUID();
    const corrHeaders = {
      ...superHeaders,
      'x-correlation-id': corrId,
      'idempotency-key': idemKey,
    };

    const newBranchPayload = {
      tenantUuid: tenant.uuid,
      businessUuid: business.uuid,
      name: 'Delhi NCR Branch',
      slug: 'delhi-ncr-branch',
      email: 'delhi@alice.com',
      phone: '+919999999999',
      branchCode: 'BR-DEL01',
      settings: {
        invoicePrefix: 'DL-INV',
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
      },
      branding: {
        theme: 'dark',
        primaryColor: '#FF5733',
      },
      contacts: {
        email: 'delhi-support@alice.com',
        phone: '+918888888888',
      },
      address: {
        addressLine1: 'Delhi Road 10',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        postalCode: '110001',
        addressType: 'branch',
      },
      preferences: [
        { key: 'notifications.sms.enabled', value: 'true', datatype: 'boolean', category: 'notifications' }
      ]
    };

    const resCreate = await makeRequest(port, '/api/v1/platform/branches', 'POST', corrHeaders, newBranchPayload);
    assert.strictEqual(resCreate.status, 201, 'Creation should succeed');
    assert.strictEqual(resCreate.body.data.name, 'Delhi NCR Branch', 'Name matches');
    assert.strictEqual(resCreate.body.data.branchCode, 'BR-DEL01', 'BranchCode matches');
    assert.strictEqual(resCreate.body.data.status, 'active', 'Initial status matches');

    const branchUuid = resCreate.body.data.uuid;

    // Verify settings created in DB
    const dbSettings = await BranchSettings.findAll({ where: { branchId: resCreate.body.data.id } });
    const invoicePrefixSetting = dbSettings.find(s => s.key === 'billing.prefix.invoice');
    assert.strictEqual(invoicePrefixSetting.value, 'DL-INV', 'Key-value config registry setting created');

    // Verify outbox created
    const pendingOutbox = await Outbox.findOne({ where: { eventName: 'BranchCreated' } });
    assert.ok(pendingOutbox, 'Domain event recorded inside transactional outbox table');
    const parsedPayload = typeof pendingOutbox.payload === 'string' ? JSON.parse(pendingOutbox.payload).payload : pendingOutbox.payload.payload;
    assert.strictEqual(parsedPayload.branchUuid, branchUuid, 'Outbox payload matches');

    console.log('-> Branch provisioning & outbox records: PASSED');

    // ─── [4] Test Idempotency Support ─────────────────────────────────────────
    console.log('\n[4] Testing Idempotency-Key duplicate replay protection...');
    // Replay identical POST
    const resReplay = await makeRequest(port, '/api/v1/platform/branches', 'POST', corrHeaders, newBranchPayload);
    assert.strictEqual(resReplay.status, 201, 'Replayed request gets cached success response');
    assert.strictEqual(resReplay.body.data.uuid, branchUuid, 'Replayed uuid matches exactly');
    console.log('-> Idempotency Replay Protection: PASSED');

    // ─── [5] Test Subscription Limit Policy Enforcement ───────────────────────
    console.log('\n[5] Testing Subscription Limit Policy Enforcement...');
    // Let's create a second branch (which is the limit since maxBranches is 2. The first was created automatically during business creation, wait! 
    // Business create seeded 1 branch, Delhi branch is 2nd. So creating a 3rd branch should hit the limit!)
    // Mumbai Branch (2nd) - should succeed
    const payload2 = {
      ...newBranchPayload,
      name: 'Mumbai Branch',
      slug: 'mumbai-branch',
      email: 'mumbai@alice.com',
    };

    const resCreate2 = await makeRequest(port, '/api/v1/platform/branches', 'POST', superHeaders, payload2);
    assert.strictEqual(resCreate2.status, 201, 'Second branch Mumbai should succeed');

    // Bangalore Branch (3rd) - should fail due to limit maxBranches = 2
    const payload3 = {
      ...newBranchPayload,
      name: 'Bangalore Branch',
      slug: 'bangalore-branch',
      email: 'bangalore@alice.com',
    };

    const resCreate3 = await makeRequest(port, '/api/v1/platform/branches', 'POST', superHeaders, payload3);
    assert.strictEqual(resCreate3.status, 403, 'Should fail with 403 Forbidden due to limit exhaustion');
    assert.strictEqual(resCreate3.body.errorCode, 'LIMIT_EXCEEDED', 'Returns LIMIT_EXCEEDED error code');
    console.log('-> Subscription Limit Policy: PASSED');

    // ─── [6] Test Optimistic Locking ──────────────────────────────────────────
    console.log('\n[6] Testing Optimistic Locking concurrent conflicts...');
    const branchToLock = await Branch.findOne({ where: { uuid: branchUuid } });
    
    // Update 1 (success)
    const resUpdate1 = await makeRequest(port, `/api/v1/platform/branches/${branchUuid}`, 'PUT', superHeaders, {
      name: 'Delhi NCR Branch Updated 1',
      version: branchToLock.version,
    });
    assert.strictEqual(resUpdate1.status, 200, 'First update succeeds');
    assert.strictEqual(resUpdate1.body.data.version, 2, 'Version incremented to 2');

    // Update 2 (fails because version is stale)
    const resUpdate2 = await makeRequest(port, `/api/v1/platform/branches/${branchUuid}`, 'PUT', superHeaders, {
      name: 'Delhi NCR Branch Updated 2',
      version: branchToLock.version, // stale version (1)
    });
    assert.strictEqual(resUpdate2.status, 409, 'Conflict overwrite should return 409 Conflict');
    assert.strictEqual(resUpdate2.body.errorCode, 'CONCURRENT_OVERWRITE_CONFLICT', 'Error code matched');
    console.log('-> Optimistic locking conflict validation: PASSED');

    // ─── [7] Test Health & Summary Generic Endpoints ─────────────────────────
    console.log('\n[7] Testing Platform-Generic Health and Summary Diagnostics...');
    const resHealth = await makeRequest(port, `/api/v1/platform/branches/${branchUuid}/health`, 'GET', superHeaders);
    assert.strictEqual(resHealth.status, 200, 'Health check succeeds');
    assert.strictEqual(resHealth.body.data.metrics.totalUsers, 1, 'Generic users count matched');
    assert.strictEqual(resHealth.body.data.medicines, undefined, 'No product leaks in health diagnostics');

    const resSummary = await makeRequest(port, `/api/v1/platform/branches/${branchUuid}/summary`, 'GET', superHeaders);
    assert.strictEqual(resSummary.status, 200, 'Summary check succeeds');
    assert.strictEqual(resSummary.body.data.medicines, undefined, 'No product leaks in summary analytics');
    console.log('-> Platform-Generic Health & Summary: PASSED');

    // ─── [8] Test Lifecycle Status Transition Machine ────────────────────────
    console.log('\n[8] Testing Lifecycle Manager State Transitions...');
    // Suspend
    const resSuspend = await makeRequest(port, `/api/v1/platform/branches/${branchUuid}/suspend`, 'POST', superHeaders);
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

    // Delete (Soft delete)
    const resDelete = await makeRequest(port, `/api/v1/platform/branches/${branchUuid}`, 'DELETE', superHeaders);
    assert.strictEqual(resDelete.status, 200);
    assert.strictEqual(resDelete.body.data.status, 'deleted');

    // Confirm isDeleted in DB
    const deletedDb = await Branch.findOne({ where: { uuid: branchUuid } });
    assert.strictEqual(deletedDb.isDeleted, true, 'Soft deleted flag set to true');
    console.log('-> Lifecycle status transitions: PASSED');

    console.log('\n====================================================');
    console.log(' ALL BRANCH ENGINE INTEGRATION TESTS: PASSED (100%)');
    console.log('====================================================');

  } catch (err) {
    console.error('\n[FAIL] Branch Management API integration tests failed:');
    console.error(err);
    process.exit(1);
  } finally {
    // Teardown
    console.log('\n[Teardown] Tearing down integration test tables...');
    try {
      await migrationV5.down(queryInterface, sequelize.Sequelize);
      await migrationV4.down(queryInterface, sequelize.Sequelize);
      await migrationV3.down(queryInterface, sequelize.Sequelize);
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
      console.log('-> Database rolled back successfully');
    } catch (e) {
      console.error('[TEARDOWN_WARN] Failed to rollback database cleanly:', e);
    }
    if (server) {
      server.close();
    }
  }
};

runTests();
