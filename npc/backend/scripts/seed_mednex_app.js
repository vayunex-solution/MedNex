'use strict';

const dotenv = require('dotenv');
dotenv.config();

const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const s = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, dialect: 'mysql', logging: false }
);

async function seed() {
  try {
    // Check if MedNex already exists
    const [existing] = await s.query("SELECT id FROM plat_applications WHERE slug = 'mednex' LIMIT 1");
    if (existing.length > 0) {
      console.log('MedNex application already exists in registry, skipping...');
      process.exit(0);
    }

    const appUuid = uuidv4();
    const sdkClientId = `nex_sdk_${crypto.randomBytes(12).toString('hex')}`;
    const sdkClientSecret = `nex_secret_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Insert MedNex application
    await s.query(`
      INSERT INTO plat_applications 
        (uuid, name, displayName, slug, description, category, status, environment, productionUrl, stagingUrl, sdkVersion, manifest, isActive, isDeleted, createdAt, updatedAt)
      VALUES 
        (?, 'MedNex', 'MedNex SaaS', 'mednex', 'Pharmacy Management & GST Billing System', 'Healthcare', 'active', 'production', 'https://mednex.vayunexsolution.com', NULL, '1.2.4', '{"version":"1.0.0","capabilities":["auth","billing","webhooks"],"dependencies":[],"requiredScopes":["user:read","tenant:read"]}', 1, 0, ?, ?)
    `, { replacements: [appUuid, now, now] });

    const [app] = await s.query("SELECT id FROM plat_applications WHERE slug = 'mednex' LIMIT 1");
    const appId = app[0].id;

    // Insert SDK credentials
    await s.query(`
      INSERT INTO plat_application_sdk_credentials
        (uuid, applicationId, clientId, clientSecret, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `, { replacements: [uuidv4(), appId, sdkClientId, sdkClientSecret, now, now] });

    console.log('=== MedNex Application Registered ===');
    console.log(`UUID:         ${appUuid}`);
    console.log(`SDK ClientID: ${sdkClientId}`);
    console.log(`SDK Secret:   ${sdkClientSecret}`);
    console.log('=====================================');

  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await s.close();
  }
}

seed();
