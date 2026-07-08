'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_dashboard_secret_key_9988';
process.env.SINGLE_TENANT_MODE = 'false';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' Nex Platform Core: Dashboard API Integration Tests');
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
const seeder = loadModule('Platform Seeder', 'src/shared/database/seeders/20260705000000-seed-platform-data');

// Models
const Tenant = loadModule('Tenant Model', 'src/platform/tenant/tenant.model');
const Business = loadModule('Business Model', 'src/platform/business/business.model');
const Branch = loadModule('Branch Model', 'src/platform/branch/branch.model');
const UserMembership = loadModule('UserMembership Model', 'src/platform/identity/userMembership.model');
const UserSession = loadModule('UserSession Model', 'src/platform/identity/userSession.model');
const RefreshToken = loadModule('RefreshToken Model', 'src/platform/identity/refreshToken.model');
const PlatformAudit = loadModule('PlatformAudit Model', 'src/platform/audit/platformAudit.model');
const TenantAudit = loadModule('TenantAudit Model', 'src/platform/audit/tenantAudit.model');
const { User } = loadModule('User Model', 'src/models');

// Services
const identityService = loadModule('IdentityService', 'src/platform/identity/identity.service');
const auditService = loadModule('AuditService', 'src/platform/audit/audit.service');

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
    console.log('\n[0] Rebuilding database tables with Migrations (V1 & V2)...');
    try {
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
    } catch (err) {
      console.log('Warning: Rollback failed during initial cleanup (expected if tables do not exist)');
    }

    await migrationV1.up(queryInterface, sequelize.Sequelize);
    await migrationV2.up(queryInterface, sequelize.Sequelize);
    await seeder.up(queryInterface, sequelize.Sequelize);
    console.log('-> Migrations & seeders execution: PASSED');

    // Start Server
    server = app.listen(0);
    port = server.address().port;
    console.log(`-> Local HTTP Test Server running on port ${port}`);

    // Clean any stale users
    await User.destroy({ where: { email: { [sequelize.Sequelize.Op.in]: ['super@mednex.com', 'pharmacist@mednex.com'] } } });

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
      email: 'pharmacist@mednex.com',
      password: hashedPass,
      role: 'pharmacist',
      isActive: true,
    });

    // Seed dummy Tenant & Branch to assign membership for standard user
    const tenant = await Tenant.create({
      name: 'Test Tenant Ltd',
      isActive: true,
    });
    const business = await Business.create({
      tenantId: tenant.id,
      name: 'Test Business Corp',
      isActive: true,
    });
    const branch = await Branch.create({
      tenantId: tenant.id,
      businessId: business.id,
      name: 'Branch Central',
      isActive: true,
    });

    // Assign membership to pharmacist
    await UserMembership.create({
      uuid: crypto.randomUUID(),
      userId: pharmacistUser.id,
      tenantId: tenant.id,
      businessId: business.id,
      branchId: branch.id,
      roleId: 2, // Admin or standard pharmacist role id
      status: 'active',
    });

    console.log('-> Users & membership data seeding: PASSED');

    // 1. Logins
    console.log('\n[1] Testing Auth Logins...');
    
    // Login as Super Admin (bypasses membership check)
    const superLogin = await identityService.login(
      'super@mednex.com',
      'SecretPass123!',
      '127.0.0.1',
      'Mozilla/Test',
      'device_fingerprint_super'
    );
    assert.strictEqual(superLogin.requiresSelection, false, 'Super admin login does not require selection');
    assert.ok(superLogin.accessToken, 'Access token generated for Super Admin');
    assert.ok(superLogin.refreshToken, 'Refresh token generated for Super Admin');

    // Login as standard user
    const pharmacistLogin = await identityService.login(
      'pharmacist@mednex.com',
      'SecretPass123!',
      '127.0.0.1',
      'Mozilla/Test',
      'device_fingerprint_pharma'
    );
    assert.strictEqual(pharmacistLogin.requiresSelection, false, 'Single membership does not require selection');
    assert.ok(pharmacistLogin.accessToken, 'Access token generated for Pharmacist');
    
    console.log('-> Super Admin & Standard user authentication: PASSED');

    // 2. Test RBAC protection of /dashboard
    console.log('\n[2] Testing RBAC authorization for dashboard...');
    
    // Call without token
    const resNoToken = await makeRequest(port, '/api/v1/platform/dashboard', 'GET');
    assert.strictEqual(resNoToken.status, 401, 'Request without token must return 401 Unauthorized');
    
    // Call with standard user token
    const resPharma = await makeRequest(port, '/api/v1/platform/dashboard', 'GET', {
      'Authorization': `Bearer ${pharmacistLogin.accessToken}`,
    });
    assert.strictEqual(resPharma.status, 403, 'Request with pharmacist role token must return 403 Forbidden');
    
    console.log('-> Dashboard API RBAC access controls: PASSED');

    // 3. Test successful Dashboard API call by Super Admin
    console.log('\n[3] Testing successful Dashboard API call...');
    
    // Generate some dummy audits before checking dashboard
    auditService.logPlatformAction(superAdminUser.id, 'test:platform_action', 'dashboard', 'Super admin verified platform metrics');
    auditService.logTenantAction(tenant.id, pharmacistUser.id, 'test:tenant_action', 'inventory', 'Pharmacist checked stock');

    // Wait 100ms for event listener to save logs to DB
    await new Promise((r) => setTimeout(r, 150));

    const resSuper = await makeRequest(port, '/api/v1/platform/dashboard', 'GET', {
      'Authorization': `Bearer ${superLogin.accessToken}`,
    });

    assert.strictEqual(resSuper.status, 200, 'Super Admin must fetch dashboard with status 200 OK');
    assert.ok(resSuper.body.success, 'Response reports success: true');
    assert.ok(resSuper.body.data.counts, 'Counts object returned');
    assert.ok(resSuper.body.data.health, 'Health diagnostics object returned');
    assert.ok(resSuper.body.data.recentActivity, 'Recent Activity feeds returned');

    // Verify Counts match seeded records
    const counts = resSuper.body.data.counts;
    assert.ok(counts.totalTenants >= 1, 'Tenants count correct');
    assert.ok(counts.totalBusinesses >= 1, 'Businesses count correct');
    assert.ok(counts.totalBranches >= 1, 'Branches count correct');
    assert.ok(counts.activeSessions >= 2, 'Active sessions count matches (super + pharmacist logins)');

    // Verify Audits returned
    const activity = resSuper.body.data.recentActivity;
    assert.ok(activity.platform.length >= 1, 'Platform audit logs returned');
    assert.ok(activity.tenant.length >= 1, 'Tenant audit logs returned');
    assert.strictEqual(activity.platform[0].action, 'test:platform_action', 'Platform action matched');
    assert.strictEqual(activity.tenant[0].action, 'test:tenant_action', 'Tenant action matched');

    console.log('-> Super Admin Platform Dashboard API values & structure: PASSED');

    console.log('\n====================================================');
    console.log(' ALL DASHBOARD ENGINE INTEGRATION TESTS: PASSED (100%)');
    console.log('====================================================');

    // Teardown
    console.log('\n[Teardown] Tearing down integration test tables...');
    server.close();
    await migrationV2.down(queryInterface, sequelize.Sequelize);
    await migrationV1.down(queryInterface, sequelize.Sequelize);
    console.log('-> Database rolled back successfully');
    process.exit(0);

  } catch (err) {
    console.error('\n[FAIL] Dashboard API integration tests failed:');
    console.error(err);
    if (server) {
      server.close();
    }
    try {
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
    } catch {}
    process.exit(1);
  }
};

runTests();
