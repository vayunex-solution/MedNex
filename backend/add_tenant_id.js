'use strict';

const sequelize = require('./src/config/database');

const tables = [
  'medicines',
  'customers',
  'suppliers',
  'doctors',
  'batches',
  'purchase_invoices',
  'sale_invoices',
  'stock_adjustments',
  'cash_bank_entries',
  'journal_vouchers',
  'racks',
  'medicine_categories',
  'medicine_companies'
];

async function run() {
  console.log('Starting migration to add tenantId to pharmacy tables...');
  
  // 1. Fetch default tenant ID (Krishna Medicos or first tenant)
  const [tenants] = await sequelize.query('SELECT id, name FROM plat_tenants ORDER BY id ASC');
  if (tenants.length === 0) {
    console.error('No tenants found in plat_tenants! Run provisioning first.');
    process.exit(1);
  }
  
  const defaultTenantId = tenants.find(t => t.name.includes('Krishna'))?.id || tenants[0].id;
  console.log(`Using default tenant ID: ${defaultTenantId} for existing records.`);

  for (const table of tables) {
    try {
      // Check if column exists
      const [columns] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE 'tenantId'`);
      if (columns.length === 0) {
        console.log(`Adding tenantId to ${table}...`);
        await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`tenantId\` INT NULL`);
        
        // Update existing records to default tenant ID
        await sequelize.query(`UPDATE \`${table}\` SET \`tenantId\` = ? WHERE \`tenantId\` IS NULL`, {
          replacements: [defaultTenantId]
        });
        console.log(`Updated existing records in ${table} to tenantId = ${defaultTenantId}`);
      } else {
        console.log(`tenantId already exists in ${table}`);
      }
    } catch (err) {
      console.error(`Failed to process table ${table}:`, err.message);
    }
  }

  // Also verify plat_user_memberships has a record for krishna-medicos007@gmail.com
  try {
    const [memberships] = await sequelize.query('SELECT * FROM plat_user_memberships');
    if (memberships.length === 0) {
      console.log('plat_user_memberships is empty. Seeding memberships from NPC database...');
      
      // Fetch user ID of krishna-medicos007@gmail.com in MedNex
      const [users] = await sequelize.query("SELECT id FROM users WHERE email = 'krishna-medicos007@gmail.com' LIMIT 1");
      if (users.length > 0) {
        const userId = users[0].id;
        const tenantId = defaultTenantId;
        
        await sequelize.query(`
          INSERT INTO plat_user_memberships (uuid, userId, tenantId, businessId, branchId, roleId, status, createdAt, updatedAt)
          VALUES (UUID(), ?, ?, ?, ?, 2, 'active', NOW(), NOW())
        `, {
          replacements: [userId, tenantId, tenantId, tenantId]
        });
        console.log(`Created admin membership for user ID ${userId} in tenant ID ${tenantId}`);
      }
    }
  } catch (err) {
    console.error('Failed to seed memberships:', err.message);
  }

  console.log('Migration completed successfully!');
  process.exit(0);
}

run();
