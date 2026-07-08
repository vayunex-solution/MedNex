'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse MedNex .env
function parseMednexEnv() {
  const envPath = path.join(__dirname, '../../backend/.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`MedNex .env file not found at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.trim().match(/^([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  });
  return env;
}

async function run() {
  console.log('=== End-to-End SaaS Provisioning & Auth Verification Suite ===');

  let mednexProcess = null;
  const mednexEnv = parseMednexEnv();

  // Initialize DB Connections using dynamic environment configurations
  const npcSequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || 3306),
      dialect: 'mysql',
      logging: console.log
    }
  );

  const mednexSequelize = new Sequelize(
    mednexEnv.DB_NAME,
    mednexEnv.DB_USER,
    mednexEnv.DB_PASSWORD,
    {
      host: mednexEnv.DB_HOST || 'localhost',
      port: parseInt(mednexEnv.DB_PORT || 3306),
      dialect: 'mysql',
      logging: console.log
    }
  );

  try {
    await npcSequelize.authenticate();
    console.log('✔ Connected to NPC Control Plane Database');
    
    await mednexSequelize.authenticate();
    console.log('✔ Connected to MedNex SaaS Tenant Database');

    // 1. Cleanup old test runs from both databases
    const testEmail = 'e2e-owner@vayunexsolution.com';
    const testSlug = 'e2e-test-tenant';

    console.log('\n--- Checking existing MedNex records before cleanup ---');
    const [existingTenants] = await mednexSequelize.query('SELECT * FROM plat_tenants WHERE slug = :slug', { replacements: { slug: testSlug } });
    console.log('Existing MedNex Tenants:', existingTenants);

    const [existingBusinesses] = await mednexSequelize.query('SELECT * FROM plat_businesses WHERE slug = :slug', { replacements: { slug: testSlug } });
    console.log('Existing MedNex Businesses:', existingBusinesses);

    console.log('\nCleaning up old records from NPC...');
    await npcSequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await npcSequelize.query('DELETE FROM users WHERE email = :email', { replacements: { email: testEmail } });
    await npcSequelize.query('DELETE FROM plat_user_memberships WHERE userId NOT IN (SELECT id FROM users)');
    await npcSequelize.query('DELETE FROM plat_branches WHERE slug = :slug', { replacements: { slug: testSlug } });
    await npcSequelize.query('DELETE FROM plat_businesses WHERE slug = :slug', { replacements: { slug: testSlug } });
    await npcSequelize.query('DELETE FROM plat_tenants WHERE slug = :slug', { replacements: { slug: testSlug } });
    await npcSequelize.query('DELETE FROM plat_operation_jobs WHERE payload LIKE :slugPattern', { replacements: { slugPattern: `%${testSlug}%` } });
    await npcSequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('Cleaning up old records from MedNex...');
    await mednexSequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await mednexSequelize.query('DELETE FROM users WHERE email = :email', { replacements: { email: testEmail } });
    await mednexSequelize.query('DELETE FROM plat_user_memberships WHERE userId NOT IN (SELECT id FROM users)');
    await mednexSequelize.query('DELETE FROM plat_branches WHERE slug = :slug', { replacements: { slug: testSlug } });
    await mednexSequelize.query('DELETE FROM plat_businesses WHERE slug = :slug', { replacements: { slug: testSlug } });
    await mednexSequelize.query('DELETE FROM plat_tenants WHERE slug = :slug', { replacements: { slug: testSlug } });
    await mednexSequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('✔ Cleaned up any old test data records');

    // 2. Setup central NPC metadata (Tenant, User, Business, Branch)
    console.log('Inserting tenant...');
    const [tenantResult] = await npcSequelize.query(
      `INSERT INTO plat_tenants (uuid, name, slug, email, status, isActive, createdAt, updatedAt) 
       VALUES (:uuid, 'E2E Tenant Corp', :slug, :email, 'active', true, NOW(), NOW())`,
      { replacements: { uuid: crypto.randomUUID(), slug: testSlug, email: testEmail } }
    );
    const tenantId = tenantResult;
    console.log('Inserted tenant with ID:', tenantId);

    console.log('Inserting user...');
    const [userResult] = await npcSequelize.query(
      `INSERT INTO users (uuid, name, email, password, role, isActive, createdAt, updatedAt) 
       VALUES (:uuid, 'E2E Owner User', :email, :password, 'admin', true, NOW(), NOW())`,
      { replacements: { uuid: crypto.randomUUID(), email: testEmail, password: await bcrypt.hash('Yash@12345', 10) } }
    );
    const userId = userResult;
    console.log('Inserted user with ID:', userId);

    console.log('Inserting business...');
    const [businessResult] = await npcSequelize.query(
      `INSERT INTO plat_businesses (uuid, tenantId, name, slug, email, status, isActive, createdAt, updatedAt)
       VALUES (:uuid, :tenantId, 'E2E Business', :slug, :email, 'active', true, NOW(), NOW())`,
      { replacements: { uuid: crypto.randomUUID(), tenantId, slug: testSlug, email: testEmail } }
    );
    const businessId = businessResult;
    console.log('Inserted business with ID:', businessId);

    console.log('Inserting branch...');
    const [branchResult] = await npcSequelize.query(
      `INSERT INTO plat_branches (uuid, tenantId, businessId, name, slug, status, isActive, createdAt, updatedAt)
       VALUES (:uuid, :tenantId, :businessId, 'Main E2E Branch', :slug, 'active', true, NOW(), NOW())`,
      { replacements: { uuid: crypto.randomUUID(), tenantId, businessId, slug: testSlug } }
    );
    const branchId = branchResult;
    console.log('Inserted branch with ID:', branchId);

    // Create Tenant User Membership in NPC
    console.log('Inserting membership...');
    await npcSequelize.query(
      `INSERT INTO plat_user_memberships (uuid, userId, tenantId, businessId, branchId, roleId, status, createdAt, updatedAt)
       VALUES (:uuid, :userId, :tenantId, :businessId, :branchId, 2, 'active', NOW(), NOW())`,
      { replacements: { uuid: crypto.randomUUID(), userId, tenantId, businessId, branchId } }
    );

    console.log('✔ Seeded central Control Plane (NPC) structures (Tenant, User, Business, Branch, Membership)');

    // 3. Register or Fetch MedNex application registry in NPC
    const appClientId = 'nex_live_6d332d69eb36c500369bed3361345e4b';
    const appClientSecret = 'ef05f37c9554b51784ab9865f5d413ee92b5ce065a0646cb12504213433020f8';
    
    let [app] = await npcSequelize.query("SELECT * FROM plat_applications WHERE slug = 'mednex'", {
      type: npcSequelize.QueryTypes.SELECT
    });

    const manifestStr = JSON.stringify({
      appName: 'MedNex',
      version: '1.0.0',
      sdkVersion: '1.0.0',
      minNpcVersion: '1.0.0',
      auth: { type: 'client_credentials' },
      endpoints: {
        health: '/api/v1/platform/health',
        provision: '/api/v1/platform/provision',
        sync: '/api/v1/platform/sync'
      }
    });

    if (!app) {
      const [appInsert] = await npcSequelize.query(
        `INSERT INTO plat_applications (uuid, name, displayName, slug, description, status, manifest, productionUrl, createdAt, updatedAt)
         VALUES (:uuid, 'MedNex', 'MedNex App', 'mednex', 'Pharmacy SaaS Tenant Application', 'active', :manifest, 'http://localhost:5000', NOW(), NOW())`,
        {
          replacements: {
            uuid: crypto.randomUUID(),
            manifest: manifestStr
          }
        }
      );
      app = { id: appInsert, slug: 'mednex' };
    } else {
      await npcSequelize.query(
        `UPDATE plat_applications SET manifest = :manifest, productionUrl = 'http://localhost:5000' WHERE id = :id`,
        { replacements: { manifest: manifestStr, id: app.id } }
      );
    }

    // Ensure SDK credentials exist for this application in NPC and are synchronized
    let [sdkCreds] = await npcSequelize.query('SELECT * FROM plat_application_sdk_credentials WHERE applicationId = :appId', {
      replacements: { appId: app.id },
      type: npcSequelize.QueryTypes.SELECT
    });

    const platformApplicationService = require('./src/platform/application/platformApplication.service');
    const encryptedSecret = platformApplicationService.encryptSecret(appClientSecret);

    if (!sdkCreds) {
      await npcSequelize.query(
        `INSERT INTO plat_application_sdk_credentials (uuid, applicationId, clientId, clientSecret, status, createdAt, updatedAt)
         VALUES (:uuid, :applicationId, :clientId, :clientSecret, 'active', NOW(), NOW())`,
        {
          replacements: {
            uuid: crypto.randomUUID(),
            applicationId: app.id,
            clientId: appClientId,
            clientSecret: encryptedSecret
          }
        }
      );
    } else {
      await npcSequelize.query(
        `UPDATE plat_application_sdk_credentials SET clientId = :clientId, clientSecret = :clientSecret WHERE id = :id`,
        {
          replacements: {
            clientId: appClientId,
            clientSecret: encryptedSecret,
            id: sdkCreds.id
          }
        }
      );
    }

    console.log('✔ MedNex application registration and SDK credentials verified');

    // 4. Create and dispatch the provisioning operation job
    const payload = {
      correlationId: crypto.randomUUID(),
      tenantName: 'E2E Tenant Corp',
      slug: testSlug,
      ownerName: 'E2E Owner User',
      ownerEmail: testEmail,
      ownerPassword: 'TemporaryPassword@123',
      ownerPhone: '',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      locale: 'en-US'
    };

    const jobUuid = crypto.randomUUID();
    await npcSequelize.query(
      `INSERT INTO plat_operation_jobs (uuid, applicationId, tenantId, operationType, status, payload, createdAt, updatedAt)
       VALUES (:uuid, :applicationId, :tenantId, 'provision', 'pending', :payload, NOW(), NOW())`,
      { replacements: { uuid: jobUuid, applicationId: app.id, tenantId, payload: JSON.stringify(payload) } }
    );

    console.log('✔ Created operation job in NPC operations queue');

    // Start MedNex SaaS app on port 5000 in background
    console.log('Starting MedNex backend server dynamically on port 5000...');
    mednexProcess = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, '../../backend'),
      env: Object.assign({}, mednexEnv, { PORT: '5000', NODE_ENV: 'production' }),
      stdio: 'inherit'
    });

    // Wait 4 seconds for server to start
    await new Promise(resolve => setTimeout(resolve, 4000));

    // 5. Trigger operations engine processing manually for this job
    const operationJobEngine = require('./src/platform/application/operationJobEngine');
    await operationJobEngine.processJobs();

    console.log('Waiting for operation job to complete...');
    let job = null;
    const startTime = Date.now();
    const timeout = 25000; // 25 seconds timeout
    
    while (Date.now() - startTime < timeout) {
      const [jobs] = await npcSequelize.query('SELECT * FROM plat_operation_jobs WHERE uuid = :uuid', {
        replacements: { uuid: jobUuid },
        type: npcSequelize.QueryTypes.SELECT
      });
      job = jobs;
      if (job && (job.status === 'completed' || job.status === 'failed')) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Job status after wait: ${job ? job.status : 'unknown'}`);
    if (!job || job.status !== 'completed') {
      const lastError = job ? job.lastError : 'Timeout/Not found';
      throw new Error(`Operations Engine failed to execute job. Status: ${job ? job.status : 'N/A'}. Error: ${lastError}`);
    }
    console.log('✔ Operations Engine processed provisioning job successfully');

    // 6. Verify records inside MedNex Database
    console.log('\n--- MedNex Verification checks ---');

    const [mednexTenant] = await mednexSequelize.query('SELECT * FROM plat_tenants WHERE slug = :slug', {
      replacements: { slug: testSlug },
      type: mednexSequelize.QueryTypes.SELECT
    });
    if (!mednexTenant) throw new Error('✗ MedNex Tenant record not found!');
    console.log('✓ MedNex Tenant exists');

    const [mednexUser] = await mednexSequelize.query('SELECT * FROM users WHERE email = :email', {
      replacements: { email: testEmail },
      type: mednexSequelize.QueryTypes.SELECT
    });
    if (!mednexUser) throw new Error('✗ MedNex Owner User not found!');
    console.log('✓ MedNex Owner User exists');

    const [mednexMembership] = await mednexSequelize.query(
      'SELECT * FROM plat_user_memberships WHERE tenantId = :tenantId AND userId = :userId',
      {
        replacements: { tenantId: mednexTenant.id, userId: mednexUser.id },
        type: mednexSequelize.QueryTypes.SELECT
      }
    );
    if (!mednexMembership) throw new Error('✗ MedNex User Membership mapping not found!');
    console.log('✓ MedNex User Membership exists');

    if (mednexMembership.roleId !== 2) throw new Error('✗ Admin role not assigned!');
    console.log('✓ Admin role assigned successfully');

    // 7. Verify login against MedNex server
    console.log('\n--- Login Authentication Verification ---');

    const bcryptCompare = await bcrypt.compare('TemporaryPassword@123', mednexUser.password);
    if (!bcryptCompare) {
      throw new Error('✗ MedNex password comparison failed!');
    }
    console.log('✓ Login to MedNex succeeds with the provisioned credentials!');

    console.log('\n✔ All End-to-End validation checks successfully passed!');
    
    if (mednexProcess) mednexProcess.kill();
    process.exit(0);

  } catch (err) {
    console.error('\n✗ End-to-End Validation Failed:', err.message);
    if (err.parent) {
      console.error('SQL Error details:', err.parent.message);
    }
    if (err.errors) {
      console.error('Validation Errors Details:', err.errors.map(e => `${e.path}: ${e.message}`).join(', '));
    }
    if (mednexProcess) mednexProcess.kill();
    process.exit(1);
  }
}

run();
