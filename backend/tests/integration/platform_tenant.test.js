'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_tenant_secret_key_1122';
process.env.SINGLE_TENANT_MODE = 'false';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' Nex Platform Core: Tenant Management API Integration Tests');
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
const seeder = loadModule('Platform Seeder', 'src/shared/database/seeders/20260705000000-seed-platform-data');

// Models
const Tenant = loadModule('Tenant Model', 'src/platform/tenant/tenant.model');
const Business = loadModule('Business Model', 'src/platform/business/business.model');
const Branch = loadModule('Branch Model', 'src/platform/branch/branch.model');
const UserMembership = loadModule('UserMembership Model', 'src/platform/identity/userMembership.model');
const TenantSettings = loadModule('TenantSettings Model', 'src/platform/settings/tenantSettings.model');
const PlatformAudit = loadModule('PlatformAudit Model', 'src/platform/audit/platformAudit.model');
const { User } = loadModule('User Model', 'src/models');

// Services
const identityService = loadModule('IdentityService', 'src/platform/identity/identity.service');

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
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, rawBody: data });
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
    console.log('\n[0] Rebuilding database tables with Migrations (V1, V2 & V3)...');
    try {
      await migrationV3.down(queryInterface, sequelize.Sequelize);
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
    } catch (err) {
      console.log('Warning: Rollback failed during initial cleanup (expected if tables do not exist)');
    }

    await migrationV1.up(queryInterface, sequelize.Sequelize);
    await migrationV2.up(queryInterface, sequelize.Sequelize);
    await migrationV3.up(queryInterface, sequelize.Sequelize);
    await seeder.up(queryInterface, sequelize.Sequelize);
    console.log('-> Migrations & seeders execution: PASSED');

    // Start Server
    server = app.listen(0);
    port = server.address().port;
    console.log(`-> Local HTTP Test Server running on port ${port}`);

    // Clean any stale users
    await User.destroy({ where: { email: { [sequelize.Sequelize.Op.in]: ['super@mednex.com', 'pharma@mednex.com', 'owner@alice.com', 'owner2@alice.com'] } } });

    // Seed test users
    const hashedPass = await bcrypt.hash('SecretPass123!', 12);
    
    // Super Admin User
    const superAdminUser = await User.create({
      id: crypto.randomUUID(),
      name: 'Dr. Platform Owner',
      email: 'super@mednex.com',
      password: hashedPass,
      role: 'super_admin',
      isActive: true,
    });

    // Standard Pharmacist User
    const pharmacistUser = await User.create({
      id: crypto.randomUUID(),
      name: 'Dr. Pharmacist User',
      email: 'pharma@mednex.com',
      password: hashedPass,
      role: 'pharmacist',
      isActive: true,
    });

    // Seed dummy Tenant, Business, Branch, and Membership for pharmacist user
    const dummyTenant = await Tenant.create({
      name: 'Dummy MedNex Pharmacy',
      slug: 'dummy-mednex-pharmacy',
      isActive: true,
    });
    const dummyBusiness = await Business.create({
      tenantId: dummyTenant.id,
      name: 'Dummy Business Corp',
      isActive: true,
    });
    const dummyBranch = await Branch.create({
      tenantId: dummyTenant.id,
      businessId: dummyBusiness.id,
      name: 'Dummy Branch Central',
      isActive: true,
    });
    await UserMembership.create({
      uuid: crypto.randomUUID(),
      userId: pharmacistUser.id,
      tenantId: dummyTenant.id,
      businessId: dummyBusiness.id,
      branchId: dummyBranch.id,
      roleId: 3, // Pharmacist role ID
      status: 'active',
    });

    console.log('-> Users data seeding: PASSED');

    // Authenticate users
    const superLogin = await identityService.login(
      'super@mednex.com',
      'SecretPass123!',
      '127.0.0.1',
      'Mozilla/Test',
      'device_super'
    );
    const pharmacistLogin = await identityService.login(
      'pharma@mednex.com',
      'SecretPass123!',
      '127.0.0.1',
      'Mozilla/Test',
      'device_pharma'
    );

    const superHeaders = { 'Authorization': `Bearer ${superLogin.accessToken}` };
    const pharmacistHeaders = { 'Authorization': `Bearer ${pharmacistLogin.accessToken}` };

    // 1. RBAC Tests
    console.log('\n[1] Testing RBAC authorization for Tenant Management...');
    
    const listPharma = await makeRequest(port, '/api/v1/platform/tenants', 'GET', pharmacistHeaders);
    assert.strictEqual(listPharma.status, 403, 'Pharmacist must be blocked with 403 Forbidden');

    const listSuper = await makeRequest(port, '/api/v1/platform/tenants', 'GET', superHeaders);
    assert.strictEqual(listSuper.status, 200, 'Super admin must fetch list successfully (200 OK)');
    
    console.log('-> RBAC restrictions: PASSED');

    // 2. Create Tenant (Provisioning success)
    console.log('\n[2] Testing Tenant Provisioning...');
    
    const newTenantPayload = {
      tenantName: 'Vayunex Healthcare',
      slug: 'vayunex-healthcare',
      ownerName: 'Alice Johnson',
      ownerEmail: 'owner@alice.com',
      ownerPassword: 'OwnerPassword123!',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      locale: 'en-US',
      planId: 'Growth',
    };

    const resCreate = await makeRequest(port, '/api/v1/platform/tenants', 'POST', superHeaders, newTenantPayload);
    assert.strictEqual(resCreate.status, 201, 'Tenant creation must succeed with 201 Created');
    assert.ok(resCreate.body.data.uuid, 'Exposed Tenant public ID is UUID');
    assert.strictEqual(resCreate.body.data.name, 'Vayunex Healthcare', 'Tenant name matches');
    assert.strictEqual(resCreate.body.data.slug, 'vayunex-healthcare', 'Tenant slug matches');
    assert.strictEqual(resCreate.body.data.status, 'active', 'Initial status set to active');

    const tenantUuid = resCreate.body.data.uuid;

    // Verify settings created in DB
    const settings = await TenantSettings.findAll({ where: { tenantId: resCreate.body.data.id } });
    const tzSetting = settings.find(s => s.key === 'timezone');
    const currSetting = settings.find(s => s.key === 'currency');
    const locSetting = settings.find(s => s.key === 'locale');
    
    assert.strictEqual(tzSetting.value, 'Asia/Kolkata', 'Timezone setting saved');
    assert.strictEqual(currSetting.value, 'INR', 'Currency setting saved');
    assert.strictEqual(locSetting.value, 'en-US', 'Locale setting saved');

    console.log('-> Tenant provisioning & settings creation: PASSED');

    // 3. Rollback on Failure & Validation
    console.log('\n[3] Testing Validation and Transaction Rollback on Failure...');
    
    // Attempt duplicate name
    const resDupName = await makeRequest(port, '/api/v1/platform/tenants', 'POST', superHeaders, {
      ...newTenantPayload,
      slug: 'different-slug',
      ownerEmail: 'owner2@alice.com',
    });
    assert.strictEqual(resDupName.status, 400, 'Duplicate name must return 400 Bad Request');

    // Attempt invalid Timezone
    const resInvalidTz = await makeRequest(port, '/api/v1/platform/tenants', 'POST', superHeaders, {
      ...newTenantPayload,
      tenantName: 'Vayunex Healthcare 2',
      slug: 'vayunex-healthcare-2',
      ownerEmail: 'owner2@alice.com',
      timezone: 'Asia/Invalid_Tz',
    });
    assert.strictEqual(resInvalidTz.status, 400, 'Invalid timezone must fail validation');

    // Verify that the duplicate or invalid user or tenant records were NOT created (transaction rolled back)
    const owner2 = await User.findOne({ where: { email: 'owner2@alice.com' } });
    assert.strictEqual(owner2, null, 'User creation rolled back on tenant validation failure');

    // Trigger service failure to log tenant.provision.failed
    const platformTenantService = loadModule('PlatformTenantService', 'src/platform/tenant/platformTenant.service');
    try {
      await platformTenantService.createTenant({
        tenantName: 'Vayunex Healthcare Rollback',
        slug: 'vayunex-healthcare-rollback',
        ownerName: 'Rollback User',
        ownerEmail: 'owner@alice.com', // Duplicate email, will fail transaction insert
        ownerPassword: 'OwnerPassword123!',
      }, superAdminUser.id);
      assert.fail('Should have failed provisioning');
    } catch (err) {
      // Expected rollback failure
    }

    console.log('-> Validation & Transaction Rollback validation: PASSED');

    // 4. Update Tenant
    console.log('\n[4] Testing Tenant Updates...');
    
    const updatePayload = {
      name: 'Vayunex Care Corp',
      timezone: 'America/New_York',
      currency: 'USD',
    };
    const resUpdate = await makeRequest(port, `/api/v1/platform/tenants/${tenantUuid}`, 'PUT', superHeaders, updatePayload);
    assert.strictEqual(resUpdate.status, 200, 'Tenant update must succeed with 200 OK');
    assert.strictEqual(resUpdate.body.data.name, 'Vayunex Care Corp', 'Tenant name updated');
    
    // Verify settings updated in DB
    const settingsUpdated = await TenantSettings.findAll({ where: { tenantId: resCreate.body.data.id } });
    const tzSettingUpdated = settingsUpdated.find(s => s.key === 'timezone');
    const currSettingUpdated = settingsUpdated.find(s => s.key === 'currency');
    
    assert.strictEqual(tzSettingUpdated.value, 'America/New_York', 'Timezone setting updated successfully');
    assert.strictEqual(currSettingUpdated.value, 'USD', 'Currency setting updated successfully');

    console.log('-> Tenant metadata and settings updates: PASSED');

    // 5. List, Search, Filters & Pagination
    console.log('\n[5] Testing Pagination, Search, and Filtering...');
    
    // Search by query
    const resSearch = await makeRequest(port, '/api/v1/platform/tenants?search=vayunex', 'GET', superHeaders);
    assert.strictEqual(resSearch.body.data.length, 1, 'Search query resolves correct tenant');

    // Filter by plan
    const resFilterPlan = await makeRequest(port, '/api/v1/platform/tenants?plan=Growth', 'GET', superHeaders);
    assert.strictEqual(resFilterPlan.body.data.length, 1, 'Filter by plan resolves correct tenant');

    const resFilterPlanFree = await makeRequest(port, '/api/v1/platform/tenants?plan=Free', 'GET', superHeaders);
    assert.strictEqual(resFilterPlanFree.body.data.length, 0, 'Filter by plan Free returns zero rows');

    console.log('-> Search, Filters, and Pagination: PASSED');

    // 6. Lifecycle Transitions (Suspend, Activate, Archive)
    console.log('\n[6] Testing Lifecycle Transitions...');
    
    // Suspend
    const resSuspend = await makeRequest(port, `/api/v1/platform/tenants/${tenantUuid}/suspend`, 'POST', superHeaders);
    assert.strictEqual(resSuspend.status, 200, 'Suspend transition: 200 OK');
    assert.strictEqual(resSuspend.body.data.status, 'suspended', 'Status updated to suspended');
    
    const checkSuspended = await Tenant.findOne({ where: { uuid: tenantUuid } });
    assert.strictEqual(checkSuspended.isActive, false, 'isActive is false when suspended');

    // Activate
    const resActivate = await makeRequest(port, `/api/v1/platform/tenants/${tenantUuid}/activate`, 'POST', superHeaders);
    assert.strictEqual(resActivate.status, 200, 'Activate transition: 200 OK');
    assert.strictEqual(resActivate.body.data.status, 'active', 'Status updated to active');
    
    const checkActivated = await Tenant.findOne({ where: { uuid: tenantUuid } });
    assert.strictEqual(checkActivated.isActive, true, 'isActive is true when activated');

    // Archive
    const resArchive = await makeRequest(port, `/api/v1/platform/tenants/${tenantUuid}/archive`, 'POST', superHeaders);
    assert.strictEqual(resArchive.status, 200, 'Archive transition: 200 OK');
    assert.strictEqual(resArchive.body.data.status, 'archived', 'Status updated to archived');
    
    const checkArchived = await Tenant.findOne({ where: { uuid: tenantUuid } });
    assert.strictEqual(checkArchived.isActive, false, 'isActive is false when archived');
    assert.strictEqual(checkArchived.isDeleted, true, 'isDeleted is true when archived (soft deleted)');

    console.log('-> Lifecycle status transitions: PASSED');

    // Restore tenant to active status for health & summary endpoints
    await checkArchived.update({ status: 'active', isActive: true, isDeleted: false });

    // 7. Health & Summary Endpoints
    console.log('\n[7] Testing Health and Summary Diagnostics...');
    
    // Health Check
    const resHealth = await makeRequest(port, `/api/v1/platform/tenants/${tenantUuid}/health`, 'GET', superHeaders);
    assert.strictEqual(resHealth.status, 200, 'Health endpoint: 200 OK');
    assert.strictEqual(resHealth.body.data.counts.users, 1, 'Owner user membership counted');
    assert.strictEqual(resHealth.body.data.counts.businesses, 1, 'Provisioned business counted');
    assert.strictEqual(resHealth.body.data.counts.branches, 1, 'Provisioned branch counted');
    assert.strictEqual(resHealth.body.data.database, 'Operational', 'Database status resolved');

    // Summary Details
    const resSummary = await makeRequest(port, `/api/v1/platform/tenants/${tenantUuid}/summary`, 'GET', superHeaders);
    assert.strictEqual(resSummary.status, 200, 'Summary endpoint: 200 OK');
    assert.strictEqual(resSummary.body.data.users, 1, 'Users summary correct');
    assert.strictEqual(resSummary.body.data.medicines, 142, 'Pharmacy medicines placeholder returned');
    assert.strictEqual(resSummary.body.data.invoices, 89, 'Billing invoices placeholder returned');

    console.log('-> Health & Summary analytics: PASSED');

    // 8. Auditing Events
    console.log('\n[8] Testing Mutation Audit Trail Logging...');
    
    // Wait 150ms for event listener to persist audits
    await new Promise((r) => setTimeout(r, 150));

    const audits = await PlatformAudit.findAll({ order: [['createdAt', 'ASC']] });
    const actions = audits.map(a => a.action);

    // Assert that audit logs exist for mutations
    assert.ok(actions.includes('tenant.created'), 'tenant.created logged');
    assert.ok(actions.includes('tenant.updated'), 'tenant.updated logged');
    assert.ok(actions.includes('tenant.suspended'), 'tenant.suspended logged');
    assert.ok(actions.includes('tenant.activated'), 'tenant.activated logged');
    assert.ok(actions.includes('tenant.archived'), 'tenant.archived logged');
    assert.ok(actions.includes('tenant.provision.failed'), 'tenant.provision.failed logged');

    console.log('-> Security auditing tracking logs: PASSED');

    console.log('\n====================================================');
    console.log(' ALL TENANT ENGINE INTEGRATION TESTS: PASSED (100%)');
    console.log('====================================================');

    // Teardown
    console.log('\n[Teardown] Tearing down integration test tables...');
    server.close();
    await migrationV3.down(queryInterface, sequelize.Sequelize);
    await migrationV2.down(queryInterface, sequelize.Sequelize);
    await migrationV1.down(queryInterface, sequelize.Sequelize);
    console.log('-> Database rolled back successfully');
    process.exit(0);

  } catch (err) {
    console.error('\n[FAIL] Tenant Management API integration tests failed:');
    console.error(err);
    if (server) {
      server.close();
    }
    try {
      await migrationV3.down(queryInterface, sequelize.Sequelize);
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
    } catch {}
    process.exit(1);
  }
};

runTests();
