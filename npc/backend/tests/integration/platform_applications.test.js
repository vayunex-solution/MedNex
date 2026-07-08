'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_applications_secret_key_9900';

const workspaceBackend = path.join(__dirname, '..', '..');

console.log('====================================================');
console.log(' Nex Platform Core: Applications Registry Integration Tests');
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

// Migrations
const migrationPlatform = loadModule('Platform Migration', 'src/shared/database/migrations/20260705000000-create-platform-tables');
const migrationIdentity = loadModule('Identity Migration', 'src/shared/database/migrations/20260705010000-create-identity-v2-tables');
const migrationTenant = loadModule('Tenant V2 Migration', 'src/shared/database/migrations/20260705020000-create-tenant-v2-fields');
const migrationApps = loadModule('Applications Registry Migration', 'src/shared/database/migrations/20260708000000-create-application-registry-tables');

// Models
const { User } = loadModule('User Model', 'src/models');
const Application = loadModule('Application Model', 'src/platform/application/application.model');
const ApplicationApiKey = loadModule('ApplicationApiKey Model', 'src/platform/application/applicationApiKey.model');
const ApplicationWebhook = loadModule('ApplicationWebhook Model', 'src/platform/application/applicationWebhook.model');
const ApplicationFeatureFlag = loadModule('ApplicationFeatureFlag Model', 'src/platform/application/applicationFeatureFlag.model');

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
      res.on('data', (chunk) => { data += chunk; });
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
  let superAdminToken = '';

  try {
    // 0. Database Setup
    console.log('\n[0] Rebuilding database tables with Migrations...');
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    try {
      await migrationApps.down(queryInterface, sequelize.Sequelize);
      await migrationTenant.down(queryInterface, sequelize.Sequelize);
      await migrationIdentity.down(queryInterface, sequelize.Sequelize);
      await migrationPlatform.down(queryInterface, sequelize.Sequelize);
    } catch (err) {
      console.log('Warning: Rollback failed during initial cleanup (expected if tables do not exist)');
    }

    await migrationPlatform.up(queryInterface, sequelize.Sequelize);
    await migrationIdentity.up(queryInterface, sequelize.Sequelize);
    await migrationTenant.up(queryInterface, sequelize.Sequelize);
    await migrationApps.up(queryInterface, sequelize.Sequelize);
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('-> Migrations execution: PASSED');

    // Start Server
    server = app.listen(0);
    port = server.address().port;
    console.log(`-> Local HTTP Test Server running on port ${port}`);

    // Seed Super Admin
    const hashedPass = await bcrypt.hash('SecretPass123!', 12);
    await User.destroy({ where: { email: 'admin@nex.com' } });
    const adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@nex.com',
      password: hashedPass,
      role: 'super_admin',
      isActive: true,
    });

    // Authenticate
    console.log('\n[1] Authenticating as Super Admin...');
    const loginRes = await makeRequest(port, '/api/v1/auth/login', 'POST', {}, {
      email: 'admin@nex.com',
      password: 'SecretPass123!',
    });

    assert.strictEqual(loginRes.status, 200, 'Login should succeed');
    superAdminToken = loginRes.body.data.accessToken;
    assert.ok(superAdminToken, 'Token should be returned');
    console.log('-> Login: PASSED');

    const headers = {
      Authorization: `Bearer ${superAdminToken}`,
    };

    // 2. Onboard application
    console.log('\n[2] Registering new application...');
    const createRes = await makeRequest(port, '/api/v1/platform/applications', 'POST', headers, {
      name: 'MedNex SaaS',
      slug: 'mednex',
      description: 'Pharmacy Management & GST Billing system',
      category: 'Healthcare',
      environment: 'production',
      productionUrl: 'https://mednex.vayunexsolution.com',
    });

    assert.strictEqual(createRes.status, 200, 'Application creation should return 200');
    const appUuid = createRes.body.data.uuid;
    assert.ok(appUuid, 'Created application should have a UUID');
    assert.strictEqual(createRes.body.data.slug, 'mednex', 'Slug must match');
    console.log('-> Onboarding: PASSED');

    // 3. Create API key
    console.log('\n[3] Generating API Key for application...');
    const apiKeyRes = await makeRequest(port, `/api/v1/platform/applications/${appUuid}/api-keys`, 'POST', headers, {
      name: 'Integrator Key',
      environment: 'production',
      scopes: ['user:read'],
    });

    assert.strictEqual(apiKeyRes.status, 200, 'Key generation should return 200');
    const keyUuid = apiKeyRes.body.data.uuid;
    const rawKey = apiKeyRes.body.data.key;
    const rawSecret = apiKeyRes.body.data.secret;
    assert.ok(keyUuid, 'Key must have UUID');
    assert.ok(rawKey.startsWith('nex_live_'), 'Key must start with prefix');
    assert.ok(rawSecret, 'Secret must be returned on creation');
    console.log('-> Key Generation: PASSED');

    // 4. List API Keys
    console.log('\n[4] Listing API Keys...');
    const listKeysRes = await makeRequest(port, `/api/v1/platform/applications/${appUuid}/api-keys`, 'GET', headers);
    assert.strictEqual(listKeysRes.status, 200);
    assert.strictEqual(listKeysRes.body.data.length, 1);
    assert.ok(listKeysRes.body.data[0].key.includes('...'), 'Keys list must mask secrets');
    console.log('-> List Keys: PASSED');

    // 5. Connection verify API Key
    console.log('\n[5] Verifying API Key connection...');
    const verifyRes = await makeRequest(port, `/api/v1/platform/applications/${appUuid}/connections/verify`, 'POST', headers, {
      type: 'api-key',
      itemUuid: keyUuid,
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.data.success, true, 'Verification should return success');
    console.log('-> Verify Connection: PASSED');

    // 6. Create Webhook
    console.log('\n[6] Creating Webhook endpoint...');
    const whRes = await makeRequest(port, `/api/v1/platform/applications/${appUuid}/webhooks`, 'POST', headers, {
      url: 'https://webhook.site/test',
      environment: 'production',
      events: ['user.created'],
    });
    assert.strictEqual(whRes.status, 200);
    const whUuid = whRes.body.data.uuid;
    assert.ok(whUuid, 'Webhook must return UUID');
    console.log('-> Create Webhook: PASSED');

    // 7. Verify Webhook connection ping
    console.log('\n[7] Simulating webhook ping verification...');
    const verifyWhRes = await makeRequest(port, `/api/v1/platform/applications/${appUuid}/connections/verify`, 'POST', headers, {
      type: 'webhook',
      itemUuid: whUuid,
    });
    assert.strictEqual(verifyWhRes.status, 200);
    assert.strictEqual(verifyWhRes.body.data.success, true);
    console.log('-> Verify Webhook connection: PASSED');

    // 8. Rotate Webhook signing secret
    console.log('\n[8] Rotating Webhook secrets...');
    const rotateWhRes = await makeRequest(port, `/api/v1/platform/applications/${appUuid}/secrets/rotate`, 'POST', headers, {
      type: 'webhook',
      itemUuid: whUuid,
    });
    assert.strictEqual(rotateWhRes.status, 200);
    assert.ok(rotateWhRes.body.data.secret, 'Must return new rotated secret');
    console.log('-> Rotate Secret: PASSED');

    // 9. Sync feature flag
    console.log('\n[9] Upserting feature flag...');
    const flagRes = await makeRequest(port, `/api/v1/platform/applications/${appUuid}/feature-flags`, 'PUT', headers, {
      key: 'enable_v2_features',
      value: 'true',
      description: 'Enable advanced V2 modules',
    });
    assert.strictEqual(flagRes.status, 200);
    assert.strictEqual(flagRes.body.data.value, 'true');
    console.log('-> Feature Flags: PASSED');

    // 10. Clean up tables
    console.log('\n[10] Tearing down integration test tables...');
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await migrationApps.down(queryInterface, sequelize.Sequelize);
    await migrationTenant.down(queryInterface, sequelize.Sequelize);
    await migrationIdentity.down(queryInterface, sequelize.Sequelize);
    await migrationPlatform.down(queryInterface, sequelize.Sequelize);
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('-> Tear Down: PASSED');

    console.log('\n====================================================');
    console.log(' ALL TESTS PASSED SUCCESSFULLY! (100% SUCCESS)');
    console.log('====================================================');

    if (server) server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL] Integration tests failed:');
    console.error(err);
    if (server) server.close();
    process.exit(1);
  }
};

runTests();
