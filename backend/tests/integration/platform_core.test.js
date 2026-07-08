'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Set mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.SINGLE_TENANT_MODE = 'false';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' Nex Platform Core: Comprehensive Integration Tests  ');
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

// Load models and services
const Tenant = loadModule('Tenant Model', 'src/platform/tenant/tenant.model');
const Business = loadModule('Business Model', 'src/platform/business/business.model');
const Branch = loadModule('Branch Model', 'src/platform/branch/branch.model');
const Subscription = loadModule('Subscription Model', 'src/platform/subscription/subscription.model');
const License = loadModule('License Model', 'src/platform/license/license.model');
const Feature = loadModule('Feature Model', 'src/platform/feature/feature.model');
const Limit = loadModule('Limit Model', 'src/platform/limits/limit.model');
const Role = loadModule('Role Model', 'src/platform/rbac/role.model');
const Permission = loadModule('Permission Model', 'src/platform/rbac/permission.model');
const RolePermission = loadModule('RolePermission Model', 'src/platform/rbac/rolePermission.model');

const tenantResolver = loadModule('TenantResolver', 'src/platform/tenant/tenantResolver');
const tenantProvisioner = loadModule('TenantProvisioner', 'src/platform/tenant/tenantProvisioner');
const rbacService = loadModule('RbacService', 'src/platform/rbac/rbac.service');
const featureService = loadModule('FeatureService', 'src/platform/feature/feature.service');
const limitService = loadModule('LimitService', 'src/platform/limits/limit.service');
const RequestContext = loadModule('RequestContext', 'src/shared/core/context');
const sequelize = loadModule('Sequelize instance', 'src/config/database');

const migration = loadModule('Platform Migration', 'src/shared/database/migrations/20260705000000-create-platform-tables');
const seeder = loadModule('Platform Seeder', 'src/shared/database/seeders/20260705000000-seed-platform-data');

const runTests = async () => {
  try {
    // 0. Database Migrations and Seeders Execution
    console.log('\n[0] Executing Sequelize migrations & seeders programmatically...');
    const queryInterface = sequelize.getQueryInterface();
    
    // Clean slate: rollback and then migrate
    await migration.down(queryInterface, sequelize.Sequelize);
    await migration.up(queryInterface, sequelize.Sequelize);
    
    // Seed initial roles, permissions, plans, settings, and super admin
    await seeder.up(queryInterface, sequelize.Sequelize);
    console.log('-> Migrations & Seeders executed successfully');

    // 1. Verify UUID implementation rules
    console.log('\n[1] Verifying UUID implementation rules...');
    assert.ok(Tenant.rawAttributes.uuid, 'Tenant model must have uuid column');
    assert.ok(Business.rawAttributes.uuid, 'Business model must have uuid column');
    assert.ok(Branch.rawAttributes.uuid, 'Branch model must have uuid column');
    assert.ok(Subscription.rawAttributes.uuid, 'Subscription model must have uuid column');
    assert.ok(License.rawAttributes.uuid, 'License model must have uuid column');
    assert.ok(Feature.rawAttributes.uuid, 'Feature model must have uuid column');
    assert.ok(Limit.rawAttributes.uuid, 'Limit model must have uuid column');
    console.log('-> UUID checks PASSED');

    // 2. Test Tenant Provisioner Transactional Flow
    console.log('\n[2] Testing single-transaction Tenant Provisioner...');
    const mockSignupData = {
      tenantName: 'Integration Test Pharmacy Inc',
      ownerName: 'Dr. Test Owner',
      ownerEmail: `owner-${Date.now()}@test.com`,
      ownerPassword: 'SecurePassword123!',
      ownerPhone: '9998887776',
      planId: 'Growth',
    };

    const provisionResult = await tenantProvisioner.provisionTenant(mockSignupData);
    assert.ok(provisionResult.tenantUuid, 'Provisioning must return tenant UUID');
    assert.ok(provisionResult.businessUuid, 'Provisioning must return business UUID');
    assert.ok(provisionResult.branchUuid, 'Provisioning must return branch UUID');
    assert.ok(provisionResult.licenseKey, 'Provisioning must return license key');
    assert.strictEqual(provisionResult.ownerEmail, mockSignupData.ownerEmail, 'Owner email matches');
    console.log('-> Tenant Provisioning transaction checks PASSED');

    // 3. Test TenantResolver Resolution Modes
    console.log('\n[3] Testing TenantResolver resolution...');
    // Mock request for Header Resolution
    const reqHeader = {
      headers: {
        'x-tenant-id': provisionResult.tenantUuid,
      },
      query: {},
    };
    const resolvedHeaderTenantId = await tenantResolver.resolveTenant(reqHeader);
    assert.ok(resolvedHeaderTenantId, 'TenantResolver must resolve tenant ID from UUID header');

    // Mock request for JWT Mode
    const reqJwt = {
      user: {
        tenantId: resolvedHeaderTenantId,
      },
      headers: {},
      query: {},
    };
    const resolvedJwtTenantId = await tenantResolver.resolveTenant(reqJwt);
    assert.strictEqual(resolvedJwtTenantId, resolvedHeaderTenantId, 'TenantResolver matches active user JWT claim tenantId');
    console.log('-> TenantResolver resolution checks PASSED');

    // 4. Test RBAC Rules Engine
    console.log('\n[4] Testing RBAC rules engine...');
    // Seed test role and permission
    await rbacService.assignPermissionToRole('pharmacist', 'dispense-drugs');
    
    // Check positive match
    const hasPerm = await rbacService.checkPermission('pharmacist', 'dispense-drugs');
    assert.ok(hasPerm, 'Pharmacist should have dispense-drugs permission');

    // Check negative match
    const hasAdminPerm = await rbacService.checkPermission('cashier', 'manage-settings');
    assert.strictEqual(hasAdminPerm, false, 'Cashier should not have manage-settings permission');
    console.log('-> RBAC validation checks PASSED');

    // 5. Test Features and Quota Limits
    console.log('\n[5] Testing Features and Quota Limits...');
    // Set custom limit
    await Limit.create({
      tenantId: resolvedHeaderTenantId,
      limitKey: 'max-custom-bills',
      limitValue: 10,
    });

    const isWithinLimit = await limitService.checkLimitQuota(resolvedHeaderTenantId, 'max-custom-bills', 5);
    assert.strictEqual(isWithinLimit, true, '5 is within limit of 10');

    const exceedsLimit = await limitService.checkLimitQuota(resolvedHeaderTenantId, 'max-custom-bills', 12);
    assert.strictEqual(exceedsLimit, false, '12 exceeds limit of 10');
    console.log('-> Features and limits checks PASSED');

    // 6. Rollback tables to leave DB clean
    console.log('\n[6] Rolling back platform database migrations...');
    await migration.down(queryInterface, sequelize.Sequelize);
    console.log('-> Database rolled back successfully');

    console.log('\n====================================================');
    console.log(' INTEGRATION TESTS COMPLETED SUCCESSFULLY (100% PASS)');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL] Integration tests failed:');
    console.error(err);
    try {
      const queryInterface = sequelize.getQueryInterface();
      await migration.down(queryInterface, sequelize.Sequelize);
    } catch {}
    process.exit(1);
  }
};

runTests();
