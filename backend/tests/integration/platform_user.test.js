'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_user_secret_key_7788';
process.env.SINGLE_TENANT_MODE = 'false';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' NPC: Universal User Engine API Integration Tests');
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
const migrationV6 = loadModule('Migration V6', 'src/shared/database/migrations/20260707010000-create-user-v2-tables');
const migrationV7 = loadModule('Migration V7', 'src/shared/database/migrations/20260707020000-hardening-user-tables-v2.1');
const seeder = loadModule('Platform Seeder', 'src/shared/database/seeders/20260705000000-seed-platform-data');

// Models
const Tenant = loadModule('Tenant Model', 'src/platform/tenant/tenant.model');
const Business = loadModule('Business Model', 'src/platform/business/business.model');
const Branch = loadModule('Branch Model', 'src/platform/branch/branch.model');
const User = loadModule('User Model', 'src/platform/user/user.model');
const UserProfile = loadModule('UserProfile Model', 'src/platform/user/userProfile.model');
const UserPreference = loadModule('UserPreference Model', 'src/platform/user/userPreference.model');
const UserNotificationPreference = loadModule('UserNotificationPreference Model', 'src/platform/user/userNotificationPreference.model');
const UserDevice = loadModule('UserDevice Model', 'src/platform/user/userDevice.model');
const UserMembership = loadModule('UserMembership Model', 'src/platform/identity/userMembership.model');
const Outbox = loadModule('Outbox Model', 'src/shared/events/outbox.model');
const Subscription = loadModule('Subscription Model', 'src/platform/subscription/subscription.model');
const License = loadModule('License Model', 'src/platform/license/license.model');

// Services
const platformUserService = loadModule('PlatformUserService', 'src/platform/user/platformUser.service');

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
    console.log('\n[0] Rebuilding database tables with Migrations (V1 to V6)...');
    try {
      const tablesToClean = [
        'plat_user_devices', 'plat_user_metadata', 'plat_user_notification_preferences',
        'plat_user_preferences', 'plat_user_profiles',
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
        'plat_subscriptions', 'plat_licenses',
        'plat_background_jobs', 'plat_processed_events', 'plat_user_password_histories'
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
      await migrationV6.up(queryInterface, sequelize.Sequelize);
      await migrationV7.up(queryInterface, sequelize.Sequelize);
      await seeder.up(queryInterface, sequelize.Sequelize);
      
      // Clean users table to avoid email unique violations with existing database seeds
      await queryInterface.sequelize.query('DELETE FROM users');
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

    const superAdminUser = await User.create({
      name: 'Super Admin',
      email: 'super@mednex.com',
      password: passwordHash,
      role: 'super_admin',
      userType: 'super_admin',
      isActive: true,
      status: 'active',
    });

    const employeeUser = await User.create({
      name: 'Employee User',
      email: 'pharma@mednex.com',
      password: passwordHash,
      role: 'pharmacist',
      userType: 'employee',
      isActive: true,
      status: 'active',
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
      maxUsers: 2, // Allow up to 2 users (excluding seed users in other tenants, wait, limit is per-tenant)
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Create default Business & Branch
    const business = await Business.create({
      tenantId: tenant.id,
      name: 'Alice Healthcare',
      slug: 'alice-healthcare',
      email: 'hq@alice.com',
      status: 'active',
      isActive: true,
      version: 1,
    });

    const branch = await Branch.create({
      tenantId: tenant.id,
      businessId: business.id,
      name: 'Delhi NCR Branch',
      slug: 'delhi-ncr-branch',
      email: 'delhi@alice.com',
      status: 'active',
      isActive: true,
    });

    // Generate JWTs directly
    const jwt = require('jsonwebtoken');
    const superToken = jwt.sign({ id: superAdminUser.id, email: superAdminUser.email, role: 'super_admin' }, process.env.JWT_SECRET);
    const employeeToken = jwt.sign({ id: employeeUser.id, email: employeeUser.email, role: 'pharmacist' }, process.env.JWT_SECRET);

    const superHeaders = { Authorization: `Bearer ${superToken}` };
    const employeeHeaders = { Authorization: `Bearer ${employeeToken}` };

    console.log('-> Users, Tenant, Business & License data seeding: PASSED');

    // ─── [1] Test Capabilities Endpoint ───────────────────────────────────────
    console.log('\n[1] Testing Capabilities Metadata Contract Endpoint...');
    const resCap = await makeRequest(port, '/api/v1/platform/capabilities', 'GET', superHeaders);
    assert.strictEqual(resCap.status, 200, 'Capabilities must succeed');
    assert.strictEqual(resCap.body.data.platformName, 'Nex Platform Core (NPC)');
    console.log('-> Capabilities Contract endpoint: PASSED');

    // ─── [2] Test RBAC Authorization ──────────────────────────────────────────
    console.log('\n[2] Testing RBAC authorization for User Management...');
    const listPharma = await makeRequest(port, '/api/v1/platform/users', 'GET', employeeHeaders);
    assert.strictEqual(listPharma.status, 403, 'Pharmacist must be blocked with 403 Forbidden');

    const listSuper = await makeRequest(port, '/api/v1/platform/users', 'GET', superHeaders);
    assert.strictEqual(listSuper.status, 200, 'Super admin must fetch list successfully');
    console.log('-> RBAC restrictions: PASSED');

    // ─── [3] Test User Provisioning, CorrelationId & Outbox ──────────────────
    console.log('\n[3] Testing User Provisioning, CorrelationId & Outbox...');
    const corrId = 'corr-id-users-7788';
    const idemKey = 'idem-key-user-' + crypto.randomUUID();
    const corrHeaders = {
      ...superHeaders,
      'x-correlation-id': corrId,
      'idempotency-key': idemKey,
    };

    const newUserPayload = {
      name: 'Bob Marley',
      email: 'bob@alice.com',
      password: 'BobSecurePassword@123',
      role: 'admin',
      userType: 'business_owner',
      tenantUuid: tenant.uuid,
      businessUuid: business.uuid,
      branchUuid: branch.uuid,
      profile: {
        firstName: 'Bob',
        lastName: 'Marley',
        timezone: 'America/New_York',
        locale: 'en-US',
      },
      preferences: [
        { key: 'ui.theme', value: 'dark', datatype: 'string', category: 'theme', scope: 'user' }
      ],
      notificationPreferences: [
        { channel: 'sms', isEnabled: true }
      ]
    };

    const resCreate = await makeRequest(port, '/api/v1/platform/users', 'POST', corrHeaders, newUserPayload);
    assert.strictEqual(resCreate.status, 201, 'Creation should succeed');
    assert.strictEqual(resCreate.body.data.name, 'Bob Marley', 'Name matches');
    assert.strictEqual(resCreate.body.data.userType, 'business_owner', 'userType matches');
    assert.strictEqual(resCreate.body.data.status, 'email_pending', 'Initial status matches email_pending');

    const userUuid = resCreate.body.data.uuid;

    // Verify outbox created
    const pendingOutbox = await Outbox.findOne({ where: { eventName: 'UserCreated' } });
    assert.ok(pendingOutbox, 'Domain event recorded inside transactional outbox table');
    const parsedPayload = typeof pendingOutbox.payload === 'string' ? JSON.parse(pendingOutbox.payload).payload : pendingOutbox.payload.payload;
    assert.strictEqual(parsedPayload.userUuid, userUuid, 'Outbox payload matches');

    console.log('-> User provisioning & outbox records: PASSED');

    // ─── [4] Test Idempotency Support ─────────────────────────────────────────
    console.log('\n[4] Testing Idempotency-Key duplicate replay protection...');
    const resReplay = await makeRequest(port, '/api/v1/platform/users', 'POST', corrHeaders, newUserPayload);
    assert.strictEqual(resReplay.status, 201, 'Replayed request gets cached success response');
    assert.strictEqual(resReplay.body.data.uuid, userUuid, 'Replayed uuid matches exactly');
    console.log('-> Idempotency Replay Protection: PASSED');

    // ─── [5] Test Subscription Limit Policy Enforcement ───────────────────────
    console.log('\n[5] Testing Subscription Limit Policy Enforcement...');
    // Create second user (which is the limit since maxUsers is 2)
    const payload2 = {
      ...newUserPayload,
      name: 'Charlie Chaplin',
      email: 'charlie@alice.com',
    };
    const resCreate2 = await makeRequest(port, '/api/v1/platform/users', 'POST', superHeaders, payload2);
    assert.strictEqual(resCreate2.status, 201, 'Second user should succeed');

    // Create third user (fails because limit is 2)
    const payload3 = {
      ...newUserPayload,
      name: 'Danny Devito',
      email: 'danny@alice.com',
    };
    const resCreate3 = await makeRequest(port, '/api/v1/platform/users', 'POST', superHeaders, payload3);
    assert.strictEqual(resCreate3.status, 403, 'Should fail with 403 Forbidden due to limit exhaustion');
    assert.strictEqual(resCreate3.body.errorCode, 'LIMIT_EXCEEDED', 'Returns LIMIT_EXCEEDED error code');
    console.log('-> Subscription Limit Policy: PASSED');

    // ─── [6] Test Optimistic Locking ──────────────────────────────────────────
    console.log('\n[6] Testing Optimistic Locking concurrent conflicts...');
    const userToLock = await User.findOne({ where: { uuid: userUuid } });

    // Update 1 (success)
    const resUpdate1 = await makeRequest(port, `/api/v1/platform/users/${userUuid}`, 'PUT', superHeaders, {
      name: 'Bob Marley Updated 1',
      version: userToLock.version,
    });
    assert.strictEqual(resUpdate1.status, 200, 'First update succeeds');
    assert.strictEqual(resUpdate1.body.data.version, 2, 'Version incremented to 2');

    // Update 2 (fails because version is stale)
    const resUpdate2 = await makeRequest(port, `/api/v1/platform/users/${userUuid}`, 'PUT', superHeaders, {
      name: 'Bob Marley Updated 2',
      version: userToLock.version, // stale version
    });
    assert.strictEqual(resUpdate2.status, 409, 'Conflict overwrite should return 409 Conflict');
    assert.strictEqual(resUpdate2.body.errorCode, 'CONCURRENT_OVERWRITE_CONFLICT', 'Error code matched');
    console.log('-> Optimistic locking conflict validation: PASSED');

    // ─── [7] Test Email / Phone Verification Flow ─────────────────────────────
    console.log('\n[7] Testing Email/Phone Verification triggers...');
    const userToVerify = await User.findOne({ where: { uuid: userUuid } });
    
    // Verify Email
    const resVerifyEmail = await makeRequest(port, `/api/v1/platform/users/${userUuid}/verify-email`, 'POST', superHeaders, {
      token: userToVerify.emailVerificationToken,
    });
    assert.strictEqual(resVerifyEmail.status, 200, 'Email verification succeeds');

    // Verify status changed to active
    const userVerified = await User.findOne({ where: { uuid: userUuid } });
    assert.strictEqual(userVerified.status, 'active', 'User status transitioned to active post email verification');
    console.log('-> Email/Phone verification triggers: PASSED');

    // ─── [8] Test Devices Management ──────────────────────────────────────────
    console.log('\n[8] Testing User Devices listing and revocation...');
    // Add device fingerprint manually
    const deviceUuid = crypto.randomUUID();
    await UserDevice.create({
      userId: userToVerify.id,
      uuid: deviceUuid,
      deviceFingerprint: 'browser-fingerprint-123',
      deviceName: 'Chrome Browser',
      os: 'Windows 11',
    });

    const resDevices = await makeRequest(port, `/api/v1/platform/users/${userUuid}/devices`, 'GET', superHeaders);
    assert.strictEqual(resDevices.status, 200);
    assert.strictEqual(resDevices.body.data.length, 1, 'Device list size matched');

    const resRevoke = await makeRequest(port, `/api/v1/platform/users/${userUuid}/devices/${deviceUuid}`, 'DELETE', superHeaders);
    assert.strictEqual(resRevoke.status, 200, 'Revoke device succeeds');

    const resDevices2 = await makeRequest(port, `/api/v1/platform/users/${userUuid}/devices`, 'GET', superHeaders);
    assert.strictEqual(resDevices2.body.data.length, 0, 'Device successfully deleted');
    console.log('-> User device tracking: PASSED');

    // ─── [9] Test Lifecycle State Transitions ─────────────────────────────────
    console.log('\n[9] Testing Lifecycle Manager State Transitions...');
    // Suspend
    const resSuspend = await makeRequest(port, `/api/v1/platform/users/${userUuid}/suspend`, 'POST', superHeaders);
    assert.strictEqual(resSuspend.status, 200);
    assert.strictEqual(resSuspend.body.data.status, 'suspended');

    // Delete (Soft delete)
    const resDelete = await makeRequest(port, `/api/v1/platform/users/${userUuid}`, 'DELETE', superHeaders);
    assert.strictEqual(resDelete.status, 200);
    assert.strictEqual(resDelete.body.data.status, 'deleted');

    const deletedDb = await User.findOne({ where: { uuid: userUuid } });
    assert.strictEqual(deletedDb.isDeleted, true, 'Soft deleted flag set to true');
    console.log('-> Lifecycle status transitions: PASSED');

    // ─── [10] Test Enterprise Hardening v2.1 ──────────────────────────────────
    console.log('\n[10] Testing Enterprise Hardening v2.1 Additions...');
    
    // Lock Providers
    const lockProvider = loadModule('LockProvider', 'src/shared/core/LockProvider').getProvider();
    assert.ok(lockProvider, 'LockProvider resolved successfully');
    
    const advisoryLock = await lockProvider.acquire('test:lock', 2000);
    assert.strictEqual(advisoryLock, true, 'Advisory lock acquired');
    
    // Simulate concurrent connection trying to acquire the same lock
    const Sequelize = require('sequelize');
    const otherSequelize = new Sequelize({
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      logging: false
    });
    
    const [result] = await otherSequelize.query('SELECT GET_LOCK(?, ?) AS lockStatus', {
      replacements: ['test:lock', 1],
      type: Sequelize.QueryTypes.SELECT
    });
    
    assert.strictEqual(result.lockStatus, 0, 'Duplicate advisory lock request on a different connection fails');
    await otherSequelize.close();
    await lockProvider.release('test:lock');
    
    // Transactional Row lock
    const tx = await sequelize.transaction();
    try {
      const rowLock = await lockProvider.acquire('test:row-lock', 2000, { strategy: 'row', transaction: tx });
      assert.strictEqual(rowLock, true, 'Row lock acquired successfully');
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    // Persistent Job Queue & DLQ
    const jobQueue = loadModule('JobQueue', 'src/shared/jobs/JobQueue');
    let taskRunCount = 0;
    jobQueue.registerHandler('test_task', async (payload) => {
      taskRunCount += payload.incrementBy || 1;
    });

    const job = await jobQueue.enqueue('test_task', { incrementBy: 5 });
    assert.ok(job.uuid, 'Job successfully enqueued');
    await jobQueue.poll();
    assert.strictEqual(taskRunCount, 5, 'Job handler executed successfully');

    // DLQ Test
    let failTaskCount = 0;
    jobQueue.registerHandler('fail_task', async () => {
      failTaskCount++;
      throw new Error('Forced task failure');
    });
    const failJob = await jobQueue.enqueue('fail_task', {}, { maxAttempts: 2 });
    
    // Process first failure
    await jobQueue.poll();
    assert.strictEqual(failTaskCount, 1);
    
    // Force poll again to retry (since attempts < maxAttempts)
    const platBackgroundJobsRepository = loadModule('platBackgroundJobs.repository', 'src/shared/jobs/platBackgroundJobs.repository');
    // Fast-forward runAt and lockedUntil to force retry instantly
    await platBackgroundJobsRepository.update(failJob.id, { runAt: new Date(Date.now() - 5000), lockedUntil: null });
    await jobQueue.poll();
    assert.strictEqual(failTaskCount, 2);

    // Assert transitioned to DLQ ('dead')
    const finalJob = await platBackgroundJobsRepository.findOne({ id: failJob.id });
    assert.strictEqual(finalJob.status, 'dead', 'Failed job transitioned to dead state (DLQ)');

    // Idempotent Event Consumer
    const platProcessedEventsRepository = loadModule('ProcessedEventsRepository', 'src/shared/events/platProcessedEvents.repository');
    const eventId = crypto.randomUUID();
    
    // Test duplicate event handling helper
    const isProcessedBefore = await platProcessedEventsRepository.exists({ eventId });
    assert.strictEqual(isProcessedBefore, false, 'Event is not processed yet');
    
    await platProcessedEventsRepository.create({ eventId });
    const isProcessedAfter = await platProcessedEventsRepository.exists({ eventId });
    assert.strictEqual(isProcessedAfter, true, 'Event is marked as processed exactly once');

    // HMAC-SHA256 Audit Chaining
    const auditService = loadModule('AuditService', 'src/platform/audit/audit.service');
    // Clear old audit logs to isolate test
    const platformAuditRepository = loadModule('PlatformAuditRepository', 'src/platform/audit/platformAudit.repository');
    await platformAuditRepository.model.destroy({ where: {}, force: true });
    
    auditService.logPlatformAction(userToVerify.id, 'test:action_1', 'test_module', 'details 1');
    auditService.logPlatformAction(userToVerify.id, 'test:action_2', 'test_module', 'details 2');
    
    // Trigger async audit queues processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const verification = await auditService.verifyChain();
    assert.strictEqual(verification.isValid, true, 'Audit chain signature verification returns valid');

    // Modify a record manually in database to verify tamper evidence triggers fail
    const auditRows = await platformAuditRepository.model.findAll();
    assert.ok(auditRows.length >= 2, 'Audit logs written successfully');
    await auditRows[0].update({ details: 'TAMPERED DETAILS CONTENT' }, { logging: false });
    
    const verificationPostTamper = await auditService.verifyChain();
    assert.strictEqual(verificationPostTamper.isValid, false, 'Modified audit details triggers invalid hash chain verification');

    // Cache Stampede Single-Flight Protection
    const cacheManager = loadModule('CacheManager', 'src/shared/cache');
    let dbQueryCount = 0;
    const fetchFunc = async () => {
      dbQueryCount++;
      return 'val_from_db';
    };
    
    // Execute multiple concurrent requests to same key
    const p1 = cacheManager.getOrSet('stampede:key', fetchFunc, 5);
    const p2 = cacheManager.getOrSet('stampede:key', fetchFunc, 5);
    const p3 = cacheManager.getOrSet('stampede:key', fetchFunc, 5);
    
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    assert.strictEqual(r1, 'val_from_db');
    assert.strictEqual(r2, 'val_from_db');
    assert.strictEqual(r3, 'val_from_db');
    assert.strictEqual(dbQueryCount, 1, 'Only one database lookup triggered due to single-flight locking stampede protection');

    // Cursor Pagination
    const resCursor = await makeRequest(port, '/api/v2/platform/users?limit=5', 'GET', superHeaders);
    assert.strictEqual(resCursor.status, 200);
    assert.ok(resCursor.body.data.nextCursor, 'Cursor returned for pagination');

    // Bulk Operations API test
    const bulkPayload = { uuids: [userToVerify.uuid] };
    const resBulkSuspend = await makeRequest(port, '/api/v1/platform/users/bulk-suspend', 'POST', superHeaders, bulkPayload);
    assert.strictEqual(resBulkSuspend.status, 200);
    assert.strictEqual(resBulkSuspend.body.data.success.length, 1, 'User bulk suspended successfully');
    
    const suspendedUser = await User.findOne({ where: { uuid: userToVerify.uuid } });
    assert.strictEqual(suspendedUser.status, 'suspended', 'User status transitioned to suspended post bulk suspend');

    const resBulkActivate = await makeRequest(port, '/api/v1/platform/users/bulk-activate', 'POST', superHeaders, bulkPayload);
    assert.strictEqual(resBulkActivate.status, 200);
    
    const activeUser = await User.findOne({ where: { uuid: userToVerify.uuid } });
    assert.strictEqual(activeUser.status, 'active', 'User status transitioned to active post bulk activation');

    console.log('-> Enterprise Hardening v2.1 (Locks, DLQ, Idempotency, HMAC Audits, Cache, Pagination, Bulks): PASSED');

    console.log('\n====================================================');
    console.log(' ALL USER ENGINE INTEGRATION TESTS: PASSED (100%)');
    console.log('====================================================');

  } catch (err) {
    console.error('\n[FAIL] Universal User Engine API integration tests failed:');
    console.error(err);
    process.exit(1);
  } finally {
    // Teardown
    console.log('\n[Teardown] Tearing down integration test tables...');
    try {
      await migrationV7.down(queryInterface, sequelize.Sequelize);
      await migrationV6.down(queryInterface, sequelize.Sequelize);
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
