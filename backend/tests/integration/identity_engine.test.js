'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.SINGLE_TENANT_MODE = 'false';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' Nex Platform Core: Identity Engine Integration Tests');
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

const sequelize = loadModule('Sequelize instance', 'src/config/database');
const migrationV1 = loadModule('Migration V1', 'src/shared/database/migrations/20260705000000-create-platform-tables');
const migrationV2 = loadModule('Migration V2', 'src/shared/database/migrations/20260705010000-create-identity-v2-tables');
const seeder = loadModule('Platform Seeder', 'src/shared/database/seeders/20260705000000-seed-platform-data');

// Models
const Tenant = loadModule('Tenant Model', 'src/platform/tenant/tenant.model');
const Business = loadModule('Business Model', 'src/platform/business/business.model');
const Branch = loadModule('Branch Model', 'src/platform/branch/branch.model');
const Role = loadModule('Role Model', 'src/platform/rbac/role.model');
const Permission = loadModule('Permission Model', 'src/platform/rbac/permission.model');
const UserMembership = loadModule('UserMembership Model', 'src/platform/identity/userMembership.model');
const UserSession = loadModule('UserSession Model', 'src/platform/identity/userSession.model');
const RefreshToken = loadModule('RefreshToken Model', 'src/platform/identity/refreshToken.model');
const LoginRateLimit = loadModule('LoginRateLimit Model', 'src/platform/identity/loginRateLimit.model');
const ApiKey = loadModule('ApiKey Model', 'src/platform/identity/apiKey.model');
const ApiKeyScope = loadModule('ApiKeyScope Model', 'src/platform/identity/apiKeyScope.model');
const PasswordReset = loadModule('PasswordReset Model', 'src/platform/identity/passwordReset.model');
const { User } = loadModule('User Model', 'src/models');

// Services
const identityService = loadModule('IdentityService', 'src/platform/identity/identity.service');

const runTests = async () => {
  const queryInterface = sequelize.getQueryInterface();
  try {
    // 0. Database Setup
    console.log('\n[0] Rebuilding database tables with Migrations (V1 & V2)...');
    try {
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
    } catch {}

    await migrationV1.up(queryInterface, sequelize.Sequelize);
    await migrationV2.up(queryInterface, sequelize.Sequelize);
    await seeder.up(queryInterface, sequelize.Sequelize);
    console.log('-> Migrations & seeders execution: PASSED');

    // Seed test structures (User, Roles, Tenant, Businesses, Branches)
    console.log('\n[Setup] Seeding multi-tenant test memberships...');
    const hashedPass = await bcrypt.hash('SecretPass123!', 12);
    
    // Clear any stale test users to ensure idempotence
    await User.destroy({ where: { email: 'john.doe@mednex.com' } });
    
    // Create test user
    const testUser = await User.create({
      id: crypto.randomUUID(),
      name: 'Dr. John Doe',
      email: 'john.doe@mednex.com',
      password: hashedPass,
      role: 'admin',
      isActive: true,
    });

    // Create Tenant
    const tenant = await Tenant.create({ name: 'MedNex Corp' });
    const business = await Business.create({ tenantId: tenant.id, name: 'MedNex Pharmacy' });
    
    // Create Branch A and Branch B
    const branchA = await Branch.create({ tenantId: tenant.id, businessId: business.id, name: 'Branch East' });
    const branchB = await Branch.create({ tenantId: tenant.id, businessId: business.id, name: 'Branch West' });

    // Fetch Roles
    const adminRole = await Role.findOne({ where: { name: 'admin' } });

    // Create memberships: user belongs to BOTH Branch East and Branch West
    await UserMembership.create({
      userId: testUser.id,
      tenantId: tenant.id,
      businessId: business.id,
      branchId: branchA.id,
      roleId: adminRole.id,
      status: 'active',
    });

    await UserMembership.create({
      userId: testUser.id,
      tenantId: tenant.id,
      businessId: business.id,
      branchId: branchB.id,
      roleId: adminRole.id,
      status: 'active',
    });
    console.log('-> Seeding completed');

    // 1. Test Workspace Selection Flow
    console.log('\n[1] Testing login workspace selection flow...');
    const loginResult = await identityService.login('john.doe@mednex.com', 'SecretPass123!', '127.0.0.1', 'Mozilla/Test', 'device_fingerprint_xyz');
    
    assert.strictEqual(loginResult.requiresSelection, true, 'User with multiple memberships must trigger workspace selection');
    assert.ok(loginResult.workspaceSelectionToken, 'Must issue a temporary selection token');
    assert.strictEqual(loginResult.workspaces.length, 2, 'Must list all 2 memberships');
    
    // Complete selection
    const selectionResult = await identityService.selectWorkspace(
      loginResult.workspaceSelectionToken,
      branchA.uuid,
      '127.0.0.1',
      'Mozilla/Test',
      'device_fingerprint_xyz'
    );
    assert.ok(selectionResult.accessToken, 'Access token issued');
    assert.ok(selectionResult.refreshToken, 'Refresh token issued');
    console.log('-> Workspace selection flow checks: PASSED');

    // 2. Test Refresh Token Rotation and Replay Protection
    console.log('\n[2] Testing Token Rotation and Replay Family Revocation...');
    const rotation1 = await identityService.rotateToken(selectionResult.refreshToken, '127.0.0.1', 'Mozilla/Test');
    assert.ok(rotation1.accessToken, 'Rotation 1 issued new access token');
    assert.ok(rotation1.refreshToken, 'Rotation 1 issued new refresh token');

    // Hijack Replay: attempt to reuse parent token (selectionResult.refreshToken)
    console.log('-> Simulating hijacked parent token replay attempt...');
    try {
      await identityService.rotateToken(selectionResult.refreshToken, '127.0.0.1', 'Mozilla/Test');
      assert.fail('Reusing parent refresh token must throw a security exception');
    } catch (err) {
      assert.strictEqual(err.message, 'Security Alert: Refresh token reuse detected. All active sessions revoked.', 'Expected family revocation alert');
      
      // Verify session was terminated
      const activeSession = await UserSession.findOne({ where: { userId: testUser.id, isActive: true } });
      assert.strictEqual(activeSession, null, 'Active session must be terminated on hijack warning');
      console.log('-> Family Revocation & Replay protection: PASSED');
    }

    // 3. Test MySQL-backed Auth Rate Limiter
    console.log('\n[3] Testing MySQL Auth Rate Limiting...');
    // Clear existing rate limits
    await LoginRateLimit.destroy({ where: {} });

    // Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      try {
        await identityService.login('john.doe@mednex.com', 'WrongPass!', '127.0.0.1', 'Mozilla/Test');
      } catch (err) {
        assert.strictEqual(err.message, 'Invalid credentials');
      }
    }

    // 6th attempt must be locked out
    try {
      await identityService.login('john.doe@mednex.com', 'SecretPass123!', '127.0.0.1', 'Mozilla/Test');
      assert.fail('6th attempt should have been locked out');
    } catch (err) {
      assert.ok(err.message.includes('Too many failed login attempts'), 'Lockout error thrown');
      console.log('-> Rate limiting lockout: PASSED');
    }

    // 4. Test Relational API Key Scopes
    console.log('\n[4] Testing Relational API Key Scopes...');
    // Seed target permission
    const testPermission = await Permission.create({ name: 'sales:read' });
    
    // Generate api key
    const rawKey = 'nex_' + crypto.randomUUID().replace(/-/g, '');
    const prefix = rawKey.substring(0, 10);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await ApiKey.create({
      tenantId: tenant.id,
      prefix,
      keyHash,
      label: 'Stripe webhook API key',
    });

    // Seed relationship
    await ApiKeyScope.create({
      apiKeyId: apiKey.id,
      permissionId: testPermission.id,
    });

    const verification = await identityService.verifyApiKey(rawKey);
    assert.ok(verification, 'API Key verified successfully');
    assert.strictEqual(verification.tenantId, tenant.id, 'TenantId matches');
    assert.deepStrictEqual(verification.scopes, ['sales:read'], 'Normalized scopes map properly');
    console.log('-> Normalized API Key scopes verification: PASSED');

    // 5. Test Password Reset Session Invalidation
    console.log('\n[5] Testing Password Reset session invalidation...');
    // Create new active session
    const freshSession = await UserSession.create({
      userId: testUser.id,
      deviceFingerprint: 'browser_fingerprint',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Create reset token
    const rawResetToken = 'reset-token-xyz';
    const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    await PasswordReset.create({
      userId: testUser.id,
      tokenHash: resetTokenHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Reset password
    await identityService.resetPassword(rawResetToken, 'NewSecurePass123!');

    // Check if session was terminated
    const checkedSession = await UserSession.findByPk(freshSession.id);
    assert.strictEqual(checkedSession.isActive, false, 'Resetting password must invalidate all active user sessions');
    console.log('-> Password reset session invalidation: PASSED');

    console.log('\n====================================================');
    console.log(' ALL IDENTITY ENGINE INTEGRATION TESTS: PASSED (100%)');
    console.log('====================================================');

    // Teardown
    console.log('\n[Teardown] Tearing down integration test tables...');
    await migrationV2.down(queryInterface, sequelize.Sequelize);
    await migrationV1.down(queryInterface, sequelize.Sequelize);
    console.log('-> Database rolled back successfully');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL] Integration tests failed:');
    console.error(err);
    try {
      await migrationV2.down(queryInterface, sequelize.Sequelize);
      await migrationV1.down(queryInterface, sequelize.Sequelize);
    } catch {}
    process.exit(1);
  }
};

runTests();
