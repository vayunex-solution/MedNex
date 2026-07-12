'use strict';

require('dotenv').config();
const sequelize = require('./src/config/database');
const platformUserService = require('./src/platform/user/platformUser.service');

async function run() {
  console.log('=== NPC Create User Diagnostic ===');

  try {
    await sequelize.authenticate();
    console.log('✔ Connected to database');

    // Find Krishna Medicos Tenant
    const [tenants] = await sequelize.query("SELECT * FROM plat_tenants WHERE name LIKE '%Krishna%'");
    if (tenants.length === 0) {
      console.log('✗ Tenant Krishna Medicos not found!');
      process.exit(1);
    }
    const tenant = tenants[0];
    console.log(`Found Tenant: ${tenant.name} (${tenant.uuid})`);

    // Find Business
    const [businesses] = await sequelize.query("SELECT * FROM plat_businesses WHERE tenantId = :tenantId", {
      replacements: { tenantId: tenant.id }
    });
    if (businesses.length === 0) {
      console.log('✗ Business not found!');
      process.exit(1);
    }
    const business = businesses[0];
    console.log(`Found Business: ${business.name} (${business.uuid})`);

    // Find Branch
    const [branches] = await sequelize.query("SELECT * FROM plat_branches WHERE tenantId = :tenantId", {
      replacements: { tenantId: tenant.id }
    });
    if (branches.length === 0) {
      console.log('✗ Branch not found!');
      process.exit(1);
    }
    const branch = branches[0];
    console.log(`Found Branch: ${branch.name} (${branch.uuid})`);

    // Attempt to run createUser
    const payload = {
      name: 'test',
      email: 'krishna-medicos008@gmail.com',
      password: 'TemporaryPassword@123',
      role: 'employee',
      userType: 'business_owner',
      tenantUuid: tenant.uuid,
      businessUuid: business.uuid,
      branchUuid: branch.uuid
    };

    console.log('\nRunning platformUserService.createUser...');
    const result = await platformUserService.createUser(payload);
    console.log('✔ User created successfully! Result:', result);

  } catch (err) {
    console.error('\n✗ Error in createUser:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

run();
