'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

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
  const mednexEnv = parseMednexEnv();
  const mednexSequelize = new Sequelize(
    mednexEnv.DB_NAME,
    mednexEnv.DB_USER,
    mednexEnv.DB_PASSWORD,
    {
      host: mednexEnv.DB_HOST || 'localhost',
      port: parseInt(mednexEnv.DB_PORT || 3306),
      dialect: 'mysql',
      logging: false
    }
  );

  try {
    await mednexSequelize.authenticate();
    console.log('✔ Connected to MedNex Database');

    // Check if user exists
    const [users] = await mednexSequelize.query("SELECT * FROM users WHERE email = 'krishna-medicos007@gmail.com'");
    if (users.length > 0) {
      console.log('✔ User exists in MedNex DB:', users[0]);
    } else {
      console.log('✗ User DOES NOT exist in MedNex DB');
    }

    // Check if tenant exists
    const [tenants] = await mednexSequelize.query("SELECT * FROM plat_tenants WHERE slug = 'krishna-medicos'");
    if (tenants.length > 0) {
      console.log('✔ Tenant exists in MedNex DB:', tenants[0]);
    } else {
      console.log('✗ Tenant DOES NOT exist in MedNex DB');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mednexSequelize.close();
    process.exit(0);
  }
}

run();
