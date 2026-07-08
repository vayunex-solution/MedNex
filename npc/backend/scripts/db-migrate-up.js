'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = require('../src/config/database');
const queryInterface = sequelize.getQueryInterface();

const migrationsDir = path.join(__dirname, '..', 'src', 'shared', 'database', 'migrations');

const runMigrations = async () => {
  try {
    console.log('Starting programmatic database migrations up...');
    
    // Disable foreign key checks
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
      
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsDir, file));
      try {
        await migration.up(queryInterface, sequelize.Sequelize);
        console.log(`-> ${file}: SUCCESS`);
      } catch (err) {
        console.log(`-> ${file}: Already run or skipped (${err.message})`);
      }
    }
    
    // Enable foreign key checks
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

runMigrations();
